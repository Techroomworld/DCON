import { useState, useRef, useCallback } from 'react';

export const useMediaStream = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Media access error:', err);
      alert('Please allow camera and microphone access.');
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !isMuted;
    }
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !isVideoOn;
    }
    setIsVideoOn((prev) => !prev);
  }, [isVideoOn]);

  const stopStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return {
    localVideoRef,
    startStream,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoOn,
    stopStream,
    localStreamRef,
  };
};