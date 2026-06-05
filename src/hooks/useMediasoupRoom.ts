import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { supabase } from '@/lib/supabase';

type Role = 'teacher' | 'student';

type ClassroomSession = {
  roomName: string;
  name: string;
  role: Role;
};

type ChatMessage = {
  id: string;
  sender: string;
  role: Role;
  message: string;
  time: string;
  flagged?: boolean;
};

type ProducerInfo = {
  id: string;
  kind: 'audio' | 'video';
  name: string;
  role: Role;
  source?: 'camera' | 'screen';
  label?: string;
};

type RemoteStream = {
  id: string;
  label: string;
  role: Role;
  kind: 'video' | 'audio';
  stream: MediaStream;
};

type AttendanceRecord = {
  id: string;
  name: string;
  role: Role;
  joinedAt: string;
};

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://dcon-1.onrender.com';

const socketUrl = BACKEND_URL.replace(/\/$/, '');

export function useMediasoupRoom(session: ClassroomSession | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [moderationAlerts, setModerationAlerts] = useState<string[]>([]);
  const [whiteboardSnapshot, setWhiteboardSnapshot] = useState<string | null>(null);
  const [whiteboardUpdatedBy, setWhiteboardUpdatedBy] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const screenProducerRef = useRef<any>(null);
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const producerIdsRef = useRef<Set<string>>(new Set());

  const createTransport = useCallback(
    async (transportType: 'send' | 'recv') => {
      return new Promise<any>((resolve, reject) => {
        socketRef.current?.emit(
          'create-transport',
          { roomName: session?.roomName, transportType },
          (response: any) => {
            if (response?.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          }
        );
      });
    },
    [session?.roomName]
  );

  const connectTransport = useCallback(
    async (transport: any, dtlsParameters: any) => {
      return new Promise<void>((resolve, reject) => {
        socketRef.current?.emit(
          'connect-transport',
          { roomName: session?.roomName, transportId: transport.id, dtlsParameters },
          (response: any) => {
            if (response?.error) {
              reject(new Error(response.error));
            } else {
              resolve();
            }
          }
        );
      });
    },
    [session?.roomName]
  );

  const produceTrack = useCallback(
    async (kind: 'audio' | 'video', track: MediaStreamTrack) => {
      if (!sendTransportRef.current) {
        throw new Error('Send transport is not ready');
      }

      return new Promise<void>((resolve, reject) => {
        sendTransportRef.current.produce({ track }, (producerId: string) => {
          socketRef.current?.emit(
            'produce',
            {
              roomName: session?.roomName,
              transportId: sendTransportRef.current.id,
              kind,
              rtpParameters: sendTransportRef.current.rtpParameters,
            },
            (response: any) => {
              if (response?.error) {
                reject(new Error(response.error));
              } else {
                producerIdsRef.current.add(response.producerId);
                resolve();
              }
            }
          );
        });
      });
    },
    [session?.roomName]
  );

  const consumeProducer = useCallback(
    async (producerInfo: ProducerInfo) => {
      if (!recvTransportRef.current || !deviceRef.current) return;

      try {
        const consumerParameters = await new Promise<any>((resolve, reject) => {
          socketRef.current?.emit(
            'consume',
            {
              roomName: session?.roomName,
              consumerTransportId: recvTransportRef.current.id,
              producerId: producerInfo.id,
              rtpCapabilities: deviceRef.current!.rtpCapabilities,
            },
            (response: any) => {
              if (response?.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            }
          );
        });

        const consumer = await recvTransportRef.current.consume({
          id: consumerParameters.id,
          producerId: consumerParameters.producerId,
          kind: consumerParameters.kind,
          rtpParameters: consumerParameters.rtpParameters,
        });

        const stream = new MediaStream([consumer.track]);
        setRemoteStreams((current) => [
          ...current.filter((item) => item.id !== consumer.id),
          {
            id: consumer.id,
            label: producerInfo.source === 'screen'
              ? `${producerInfo.name} (Screen)`
              : `${producerInfo.name} (${producerInfo.role})`,
            role: producerInfo.role,
            kind: consumer.kind,
            stream,
          },
        ]);

        consumer.on('transportclose', () => {
          setRemoteStreams((current) => current.filter((item) => item.id !== consumer.id));
        });
        consumer.on('producerclose', () => {
          setRemoteStreams((current) => current.filter((item) => item.id !== consumer.id));
        });
      } catch (err) {
        console.warn('Unable to consume producer:', err);
      }
    },
    [session?.roomName]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!socketRef.current || !session) return;

      const chatPayload = {
        roomName: session.roomName,
        sender: session.name,
        role: session.role,
        message,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      socketRef.current.emit('chat:send', chatPayload, (response: any) => {
        if (response?.error) {
          setError(response.error);
        } else {
          setChatMessages((prev) => [...prev, response.chatMessage]);
          if (response.flagged) {
            setModerationAlerts((prev) => [
              ...prev,
              `Message flagged for review: ${response.chatMessage.message}`,
            ]);
          }
        }
      });
    },
    [session]
  );

  const sendWhiteboardSnapshot = useCallback(
    async (dataUrl: string) => {
      if (!socketRef.current || !session) return;

      socketRef.current.emit(
        'whiteboard:update',
        { roomName: session.roomName, sender: session.name, dataUrl },
        (response: any) => {
          if (response?.error) {
            setError(response.error);
          }
        }
      );
    },
    [session]
  );

  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsAudioEnabled(track.enabled);
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoEnabled(track.enabled);
  }, [localStream]);

  const stopScreenShare = useCallback(async () => {
    if (screenProducerRef.current) {
      try {
        await screenProducerRef.current.close();
      } catch (err) {
        console.warn('Error closing screen producer', err);
      }
      screenProducerRef.current = null;
    }

    setScreenStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const shareScreen = useCallback(async () => {
    if (!sendTransportRef.current) {
      setError('Send transport is not ready for screen sharing');
      return;
    }

    try {
      const screenMedia = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenMedia.getVideoTracks()[0];
      if (!screenTrack) {
        throw new Error('Unable to capture screen video');
      }

      const producer = await sendTransportRef.current.produce({
        track: screenTrack,
        appData: {
          source: 'screen',
          label: `${session?.name || 'Guest'} (Screen)`,
        },
      });

      screenProducerRef.current = producer;
      setScreenStream(screenMedia);

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Screen share failed';
      setError(message);
      setScreenStream((current) => {
        current?.getTracks().forEach((track) => track.stop());
        return null;
      });
    }
  }, [session?.name, stopScreenShare]);

  const cleanup = useCallback(async () => {
    screenProducerRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current?.close();
    socketRef.current?.disconnect();
    localStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());
    setScreenStream(null);
    setIsConnected(false);
    setIsReady(false);
  }, [localStream, screenStream]);

  useEffect(() => {
    if (!session) return;

    const socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat:update', (message: ChatMessage) => {
      setChatMessages((current) => [...current, message]);
    });

    socket.on('attendance:update', (updated: AttendanceRecord[]) => {
      setAttendance(updated);
    });

    socket.on('producer:added', async (producerInfo: any) => {
      if (producerIdsRef.current.has(producerInfo.producerId || producerInfo.id)) return;
      await consumeProducer(producerInfo);
    });

    socket.on('producer:removed', (producerId: string) => {
      setRemoteStreams((current) => current.filter((item) => item.id !== producerId));
    });

    socket.on('moderation:alert', (alert: string) => {
      setModerationAlerts((current) => [...current, alert]);
    });

    socket.on('whiteboard:snapshot', (payload: { sender: string; dataUrl: string }) => {
      setWhiteboardSnapshot(payload.dataUrl);
      setWhiteboardUpdatedBy(payload.sender);
    });

    socket.connect();

    const initRoom = async () => {
      if (!socketRef.current) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      socketRef.current.emit(
        'join-room',
        { roomName: session.roomName, name: session.name, role: session.role, token },
        async (response: any) => {
          if (response?.error) {
            setError(response.error);
            return;
          }

          setAttendance(response.attendance || []);
          setChatMessages(response.chatHistory || []);
          setWhiteboardSnapshot(response.whiteboardSnapshot || null);

          try {
            const device = new Device();
            deviceRef.current = device;
            await device.load({ routerRtpCapabilities: response.routerRtpCapabilities });

            const sendTransportInfo = await createTransport('send');
            const recvTransportInfo = await createTransport('recv');

            if (!sendTransportInfo || !recvTransportInfo) {
              throw new Error('Failed to create transports');
            }

            const sendTransport = device.createSendTransport(sendTransportInfo);
            const recvTransport = device.createRecvTransport(recvTransportInfo);

            sendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
              try {
                await connectTransport(sendTransport, dtlsParameters);
                callback();
              } catch (err) {
                errback(err);
              }
            });

            sendTransport.on('produce', async ({ kind, rtpParameters, appData }: any, callback: any, errback: any) => {
              try {
                const result = await new Promise<any>((resolve, reject) => {
                  socketRef.current?.emit(
                    'produce',
                    {
                      roomName: session.roomName,
                      transportId: sendTransport.id,
                      kind,
                      rtpParameters,
                      appData,
                    },
                    (response: any) => {
                      if (response?.error) {
                        reject(new Error(response.error));
                      } else {
                        resolve(response);
                      }
                    }
                  );
                });

                producerIdsRef.current.add(result.producerId);
                callback({ id: result.producerId });
              } catch (err) {
                errback(err);
              }
            });

            recvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
              try {
                await connectTransport(recvTransport, dtlsParameters);
                callback();
              } catch (err) {
                errback(err);
              }
            });

            sendTransportRef.current = sendTransport;
            recvTransportRef.current = recvTransport;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            setLocalStream(stream);

            const audioTrack = stream.getAudioTracks()[0];
            const videoTrack = stream.getVideoTracks()[0];

            if (audioTrack) {
              await sendTransport.produce({ track: audioTrack });
            }
            if (videoTrack) {
              await sendTransport.produce({ track: videoTrack });
            }

            const existingProducers = response.producers || [];
            for (const producer of existingProducers) {
              if (producer.peerId !== socketRef.current?.id) {
                await consumeProducer(producer);
              }
            }

            setIsReady(true);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Room initialization failed';
            setError(message);
          }
        }
      );
    };

    initRoom();

    return () => {
      cleanup();
    };
  }, [cleanup, connectTransport, consumeProducer, createTransport, session]);

  const roomStatus = useMemo(
    () => ({ isConnected, isReady, error }),
    [isConnected, isReady, error]
  );

  return {
    localStream,
    screenStream,
    remoteStreams,
    chatMessages,
    attendance,
    isConnected,
    isReady,
    error,
    roomStatus,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing: Boolean(screenStream),
    moderationAlerts,
    sendMessage,
    toggleAudio,
    toggleVideo,
    shareScreen,
    stopScreenShare,
    sendWhiteboardSnapshot,
    whiteboardSnapshot,
    whiteboardUpdatedBy,
    leaveRoom: cleanup,
  };
}
