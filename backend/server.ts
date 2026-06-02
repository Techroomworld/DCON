import express from 'express';
import cors from 'cors';
import http from 'http';
import os from 'os';
import { randomUUID } from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import { createWorker } from 'mediasoup';
import type {
  Router,
  Worker,
  WebRtcTransport,
  DtlsParameters,
  Producer,
  Consumer,
  RtpCapabilities,
  RouterRtpCodecCapability,
} from 'mediasoup/types';
import dotenv from 'dotenv';
import { supabaseAdmin, verifySupabaseToken, getUserRole } from './lib/supabaseClient.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = Number(process.env.PORT || 4000);

const workers: Worker[] = [];
const rooms = new Map<string, RoomInfo>();
let nextWorkerIndex = 0;

type Role = 'teacher' | 'student';

type PeerInfo = {
  socketId: string;
  peerId: string;
  userId: string;
  name: string;
  role: Role;
  roomName: string;
  joinedAt: string;
  transportIds: Set<string>;
  producerIds: Set<string>;
  consumerIds: Set<string>;
};

type ProducerInfo = {
  id: string;
  peerId: string;
  kind: 'audio' | 'video';
  name: string;
  role: Role;
};

type AttendanceRecord = {
  id: string;
  name: string;
  role: Role;
  joinedAt: string;
};

type ChatRecord = {
  id: string;
  sender: string;
  role: Role;
  message: string;
  time: string;
  flagged?: boolean;
};

type WhiteboardSnapshot = {
  dataUrl: string;
  sender: string;
};

type RoomInfo = {
  roomId?: string;
  roomName: string;
  worker: Worker;
  router: Router;
  peers: Map<string, PeerInfo>;
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, ProducerInfo>;
  consumers: Map<string, Consumer>;
  chatHistory: ChatRecord[];
  attendance: AttendanceRecord[];
  whiteboardSnapshot?: WhiteboardSnapshot;
};

const mediaCodecs: RouterRtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
];

async function createMediasoupWorker(): Promise<Worker> {
  const worker = await createWorker({
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  worker.on('died', () => {
    console.error('Mediasoup worker died, exiting process');
    process.exit(1);
  });

  return worker;
}

async function getWorker(): Promise<Worker> {
  if (workers.length === 0) {
    const cpuCount = Math.max(1, Math.min(3, os.cpus().length - 1));
    for (let i = 0; i < cpuCount; i += 1) {
      workers.push(await createMediasoupWorker());
    }
  }

  const worker = workers[nextWorkerIndex % workers.length];
  nextWorkerIndex += 1;
  return worker;
}

async function getOrCreateRoom(roomName: string): Promise<RoomInfo> {
  if (rooms.has(roomName)) {
    return rooms.get(roomName)!;
  }

  const worker = await getWorker();
  const router = await worker.createRouter({ mediaCodecs });

  // Create room in Supabase if not exists
  let roomId = '';
  const { data: existingRoom } = await supabaseAdmin
    .from('classroom_sessions')
    .select('id')
    .eq('room_name', roomName)
    .single();

  if (existingRoom) {
    roomId = existingRoom.id;
  } else {
    const { data: newRoom } = await supabaseAdmin
      .from('classroom_sessions')
      .insert({
        room_name: roomName,
        title: roomName,
        status: 'active',
        started_at: new Date().toISOString(),
        teacher_id: '00000000-0000-0000-0000-000000000000', // placeholder
      })
      .select('id')
      .single();

    if (newRoom) {
      roomId = newRoom.id;
    }
  }

  const room: RoomInfo = {
    roomId,
    roomName,
    worker,
    router,
    peers: new Map(),
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
    chatHistory: [],
    attendance: [],
  };

  rooms.set(roomName, room);
  console.log(`Created new room ${roomName} on worker ${workers.indexOf(worker)}`);
  return room;
}

function getRoom(roomName: string): RoomInfo | undefined {
  return rooms.get(roomName);
}

function buildAttendance(room: RoomInfo): AttendanceRecord[] {
  return Array.from(room.peers.values()).map((peer) => ({
    id: peer.peerId,
    name: peer.name,
    role: peer.role,
    joinedAt: peer.joinedAt,
  }));
}

function sendAttendanceUpdate(room: RoomInfo) {
  room.attendance = buildAttendance(room);
  io.to(room.roomName).emit('attendance:update', room.attendance);
}

function moderateMessage(message: string): { flagged: boolean; reason?: string } {
  const lower = message.toLowerCase();
  const keywords = ['cheat', 'spam', 'hack', 'offensive', 'violence'];
  const matched = keywords.find((keyword) => lower.includes(keyword));
  if (matched) {
    return { flagged: true, reason: `Contains moderated keyword: ${matched}` };
  }

  if (message.length > 240) {
    return { flagged: true, reason: 'Message is too long for classroom chat.' };
  }

  return { flagged: false };
}

function getRouterRtpCapabilities(room: RoomInfo): RtpCapabilities {
  return room.router.rtpCapabilities;
}

async function createWebRtcTransport(room: RoomInfo, peer: PeerInfo): Promise<WebRtcTransport> {
  const transport = await room.router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.RELAY_IP || '127.0.0.1',
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
    appData: {
      peerId: peer.peerId,
      roomName: room.roomName,
    },
  });

  transport.on('dtlsstatechange', (dtlsState: string) => {
    if (dtlsState === 'closed') {
      transport.close();
    }
  });

  transport.on('@close', () => {
    room.transports.delete(transport.id);
  });

  return transport;
}

function removePeer(room: RoomInfo, socketId: string): void {
  const peer = room.peers.get(socketId);
  if (!peer) return;

  peer.transportIds.forEach((transportId) => {
    const transport = room.transports.get(transportId);
    transport?.close();
    room.transports.delete(transportId);
  });

  peer.producerIds.forEach((producerId) => {
    const producerInfo = room.producers.get(producerId);
    if (!producerInfo) return;
    room.producers.delete(producerId);
    io.to(room.roomName).emit('producer:removed', producerId);
  });

  peer.consumerIds.forEach((consumerId) => {
    const consumer = room.consumers.get(consumerId);
    consumer?.close();
    room.consumers.delete(consumerId);
  });

  room.peers.delete(socketId);
  sendAttendanceUpdate(room);

  if (room.peers.size === 0) {
    room.router.close();
    rooms.delete(room.roomName);
    console.log(`Closed room ${room.roomName} because it is empty`);
  }
}

io.on('connection', (socket) => {
  socket.data.peerId = randomUUID();
  console.log(`Socket connected: ${socket.id} (${socket.data.peerId})`);

  socket.on('join-room', async (payload, callback) => {
    try {
      const { roomName, name, role, token } = payload || {};
      if (!roomName || !name) {
        return callback({ error: 'roomName and name are required' });
      }

      // Verify Supabase token
      let userId = '';
      let userRole: string = role === 'teacher' ? 'teacher' : 'student';
      
      if (token) {
        const user = await verifySupabaseToken(token);
        if (!user) {
          return callback({ error: 'Invalid or expired token' });
        }
        userId = user.id;
        // Get actual role from database
        userRole = await getUserRole(userId);
      }

      const peerRole = userRole === 'teacher' ? 'teacher' : 'student';
      const room = await getOrCreateRoom(roomName);
      // Enforce session access for students: only users with session_access.has_access or paid=true can join
      if (peerRole === 'student' && userId && room.roomId) {
        try {
          const { data: accessRow } = await supabaseAdmin
            .from('session_access')
            .select('has_access, paid')
            .eq('session_id', room.roomId)
            .eq('user_id', userId)
            .single();

          if (!accessRow || (!(accessRow.has_access || accessRow.paid))) {
            return callback({ error: 'Access denied: payment or enrollment required' });
          }
        } catch (err) {
          console.error('Access check error:', err);
          return callback({ error: 'Access check failed' });
        }
      }
      const joinedAt = new Date().toISOString();

      const peer: PeerInfo = {
        socketId: socket.id,
        peerId: socket.data.peerId,
        userId,
        name,
        role: peerRole,
        roomName,
        joinedAt,
        transportIds: new Set(),
        producerIds: new Set(),
        consumerIds: new Set(),
      };

      room.peers.set(socket.id, peer);
      socket.join(roomName);
      
      // Save attendance to Supabase
      if (userId && room.roomId) {
        const { error } = await supabaseAdmin
          .from('attendance')
          .insert({
            room_id: room.roomId,
            user_id: userId,
            user_name: name,
            user_role: peerRole,
            joined_at: new Date().toISOString(),
          });
        if (error) console.error('Attendance insert error:', error);
      }

      sendAttendanceUpdate(room);

      callback({
        routerRtpCapabilities: getRouterRtpCapabilities(room),
        attendance: room.attendance,
        chatHistory: room.chatHistory,
        producers: Array.from(room.producers.values()),
        whiteboardSnapshot: room.whiteboardSnapshot?.dataUrl || null,
      });
    } catch (error) {
      console.error('join-room error', error);
      callback({ error: 'Unable to join room' });
    }
  });

  socket.on('create-transport', async (data, callback) => {
    try {
      const { roomName } = data || {};
      const room = getRoom(roomName);
      const peer = room?.peers.get(socket.id);
      if (!room || !peer) {
        return callback({ error: 'Room or peer not found' });
      }

      const transport = await createWebRtcTransport(room, peer);
      room.transports.set(transport.id, transport);
      peer.transportIds.add(transport.id);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (error) {
      console.error('create-transport error', error);
      callback({ error: 'Unable to create transport' });
    }
  });

  socket.on('connect-transport', async (data, callback) => {
    try {
      const { roomName, transportId, dtlsParameters } = data || {};
      const room = getRoom(roomName);
      const transport = room?.transports.get(transportId);
      if (!room || !transport) {
        return callback({ error: 'Transport not found' });
      }

      await transport.connect({ dtlsParameters });
      callback({ success: true });
    } catch (error) {
      console.error('connect-transport error', error);
      callback({ error: 'Unable to connect transport' });
    }
  });

  socket.on('produce', async (data, callback) => {
    try {
      const { roomName, transportId, kind, rtpParameters } = data || {};
      const room = getRoom(roomName);
      const peer = room?.peers.get(socket.id);
      const transport = room?.transports.get(transportId);

      if (!room || !peer || !transport) {
        return callback({ error: 'Transport or peer not found' });
      }

      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: {
          peerId: peer.peerId,
          name: peer.name,
          role: peer.role,
        },
      });

      const producerInfo: ProducerInfo = {
        id: producer.id,
        peerId: peer.peerId,
        kind,
        name: peer.name,
        role: peer.role,
      };

      room.producers.set(producer.id, producerInfo);
      peer.producerIds.add(producer.id);

      producer.on('transportclose', () => {
        room.producers.delete(producer.id);
      });

      producer.on('@close', () => {
        room.producers.delete(producer.id);
        io.to(roomName).emit('producer:removed', producer.id);
      });

      socket.to(roomName).emit('producer:added', {
        ...producerInfo,
        producerId: producer.id,
      });
      callback({ producerId: producer.id });
    } catch (error) {
      console.error('produce error', error);
      callback({ error: 'Unable to produce track' });
    }
  });

  socket.on('consume', async (data, callback) => {
    try {
      const { roomName, consumerTransportId, producerId, rtpCapabilities } = data || {};
      const room = getRoom(roomName);
      const peer = room?.peers.get(socket.id);
      const transport = room?.transports.get(consumerTransportId);
      const producerInfo = room?.producers.get(producerId);

      if (!room || !peer || !transport || !producerInfo) {
        return callback({ error: 'Consumer transport or producer not found' });
      }

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'Cannot consume provided producer' });
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false,
        appData: {
          peerId: peer.peerId,
          producerPeerId: producerInfo.peerId,
        },
      });

      room.consumers.set(consumer.id, consumer);
      peer.consumerIds.add(consumer.id);

      consumer.on('transportclose', () => {
        room.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        room.consumers.delete(consumer.id);
        socket.emit('producer:removed', producerId);
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
      });
    } catch (error) {
      console.error('consume error', error);
      callback({ error: 'Unable to consume producer' });
    }
  });

  socket.on('chat:send', async (payload, callback) => {
    try {
      const { roomName, sender, role, message, time, userId } = payload || {};
      const room = getRoom(roomName);
      if (!room) {
        return callback({ error: 'Room not found' });
      }

      const moderation = moderateMessage(message);
      const chatMessage: ChatRecord = {
        id: randomUUID(),
        sender,
        role,
        message,
        time,
        flagged: moderation.flagged,
      };

      room.chatHistory.push(chatMessage);
      
      // Save to Supabase
      if (room.roomId && userId) {
        const { error } = await supabaseAdmin
          .from('chat_messages')
          .insert({
            room_id: room.roomId,
            user_id: userId,
            user_name: sender,
            user_role: role,
            message,
            flagged: moderation.flagged,
          });
        if (error) console.error('Chat insert error:', error);
      }

      io.to(roomName).emit('chat:update', chatMessage);

      if (moderation.flagged) {
        io.to(roomName).emit(
          'moderation:alert',
          `Moderation review: ${sender} sent a flagged message. ${moderation.reason || ''}`
        );
      }

      callback({ chatMessage, flagged: moderation.flagged });
    } catch (error) {
      console.error('chat:send error', error);
      callback({ error: 'Unable to send chat message' });
    }
  });

  socket.on('whiteboard:update', (payload, callback) => {
    try {
      const { roomName, sender, dataUrl } = payload || {};
      const room = getRoom(roomName);
      if (!room) {
        return callback({ error: 'Room not found' });
      }

      room.whiteboardSnapshot = { dataUrl, sender };
      socket.to(roomName).emit('whiteboard:snapshot', { sender, dataUrl });
      callback({ success: true });
    } catch (error) {
      console.error('whiteboard:update error', error);
      callback({ error: 'Unable to update whiteboard' });
    }
  });

  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);

    for (const room of rooms.values()) {
      if (room.peers.has(socket.id)) {
        const peer = room.peers.get(socket.id);
        
        // Update attendance left_at
        if (peer && peer.userId && room.roomId) {
          const { error } = await supabaseAdmin
            .from('attendance')
            .update({ left_at: new Date().toISOString() })
            .eq('room_id', room.roomId)
            .eq('user_id', peer.userId);
          if (error) console.error('Attendance update error:', error);
        }

        removePeer(room, socket.id);
        break;
      }
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Check if a user (via token) has access to a named session/room
app.get('/session/:roomName/access', async (req, res) => {
  try {
    const roomName = req.params.roomName;
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : (req.query.token as string) || '';

    if (!token) {
      return res.status(401).json({ allowed: false, reason: 'No token provided' });
    }

    const user = await verifySupabaseToken(token);
    if (!user) return res.status(401).json({ allowed: false, reason: 'Invalid token' });

    const userId = user.id;
    const role = await getUserRole(userId);

    // Teachers and admins always have access
    if (role === 'teacher' || role === 'admin') {
      return res.json({ allowed: true });
    }

    // Find session by room name
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('classroom_sessions')
      .select('id')
      .eq('room_name', roomName)
      .single();

    if (sessErr || !session) {
      return res.status(404).json({ allowed: false, reason: 'Session not found' });
    }

    const sessionId = session.id;

    // Check session_access table
    const { data: accessRow, error: accessErr } = await supabaseAdmin
      .from('session_access')
      .select('has_access, paid')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (accessErr || !accessRow) {
      return res.json({ allowed: false, reason: 'No access record' });
    }

    if (accessRow.has_access || accessRow.paid) {
      return res.json({ allowed: true });
    }

    return res.json({ allowed: false, reason: 'Access denied' });
  } catch (err) {
    console.error('session access check error', err);
    return res.status(500).json({ allowed: false, reason: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`DCONS backend running on http://localhost:${PORT}`);
});
