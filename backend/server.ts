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
    origin: process.env.FRONTEND_URL || 'https://dcons.netlify.app',
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
  source?: 'camera' | 'screen';
  label?: string;
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

async function getUserFromToken(token: string) {
  if (!token) return null;
  const authUser = await verifySupabaseToken(token);
  if (!authUser) return null;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  const userRow = data || null;
  if (userRow?.role === 'admin' && !userRow.admin_type) {
    const { data: mainAdmin, error: mainAdminError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('admin_type', 'main')
      .maybeSingle();

    const assignedAdminType = mainAdmin ? 'section' : 'main';
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ admin_type: assignedAdminType, updated_at: new Date().toISOString() })
      .eq('id', userRow.id);

    if (!updateError) {
      userRow.admin_type = assignedAdminType;
    }
  }

  return { authUser, userRow, error };
}

async function getUserApproval(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('approved')
      .eq('id', userId)
      .single();

    return !error && data?.approved === true;
  } catch (err) {
    console.error('Error fetching approval status:', err);
    return false;
  }
}

async function findAuthUserByEmail(email: string) {
  const authAdmin = (supabaseAdmin.auth.admin as any);
  if (typeof authAdmin.getUserByEmail === 'function') {
    const { data, error } = await authAdmin.getUserByEmail(email);
    if (error) return null;
    return data?.user || null;
  }

  if (typeof authAdmin.listUsers === 'function') {
    const { data, error } = await authAdmin.listUsers({ query: email });
    if (error) return null;
    const users = data?.users || [];
    return users.find((user: any) => user.email === email) || null;
  }

  return null;
}

async function createOrUpdateUserRecord(userId: string, email: string, role: string, canLogin = true, approved?: boolean) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking user record:', existingError);
  }

  if (existing) {
    const updatePayload: Record<string, any> = {
      role,
      can_login: canLogin,
      email,
      updated_at: new Date().toISOString(),
    };
    if (approved !== undefined) {
      updatePayload.approved = approved;
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', userId);
    if (error) {
      throw error;
    }
    return existing;
  }

  const insertPayload: Record<string, any> = {
    id: userId,
    email,
    role,
    can_login: canLogin,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    approved: approved !== undefined ? approved : role !== 'student',
  };

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(insertPayload)
    .single();

  if (error) {
    throw error;
  }
  return data;
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
      // Enforce student approval before joining
      if (peerRole === 'student' && userId && room.roomId) {
        const isApproved = await getUserApproval(userId);
        if (!isApproved) {
          return callback({ error: 'Access denied: student account approval pending' });
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
      const { roomName, transportId, kind, rtpParameters, appData: clientAppData } = data || {};
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
          ...(clientAppData || {}),
        },
      });

      const producerAppData = producer.appData as any;
      const producerInfo: ProducerInfo = {
        id: producer.id,
        peerId: peer.peerId,
        kind,
        name: peer.name,
        role: peer.role,
        source: producerAppData?.source,
        label: producerAppData?.label || peer.name,
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

    const isApproved = await getUserApproval(userId);
    if (!isApproved) {
      return res.json({ allowed: false, reason: 'Student account approval pending' });
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

    // If student is approved, allow classroom access here.
    return res.json({ allowed: true });
  } catch (err) {
    console.error('session access check error', err);
    return res.status(500).json({ allowed: false, reason: 'Server error' });
  }
});

app.get('/students/pending', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('role', 'student')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ students: data });
  } catch (error) {
    console.error('fetch pending students error', error);
    return res.status(500).json({ error: 'Unable to fetch pending students' });
  }
});

app.patch('/students/:id/approve', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const studentId = req.params.id;

    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: 'Only student accounts can be approved' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ approved: true, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ student: data });
  } catch (error) {
    console.error('approve student error', error);
    return res.status(500).json({ error: 'Unable to approve student' });
  }
});

app.post('/students', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: authUser, error: authError } = await (supabaseAdmin.auth.admin as any).createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message || 'Failed to create student account' });
    }

    if (!authUser?.user?.id) {
      return res.status(500).json({ error: 'Failed to create student account' });
    }

    const { data: createdStudent, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: email.toLowerCase(),
        role: 'student',
        full_name: full_name || email.split('@')[0],
        can_login: true,
        approved: true,
      })
      .select('*')
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Failed to create student profile' });
    }

    return res.status(201).json({ student: createdStudent });
  } catch (error) {
    console.error('create student error', error);
    return res.status(500).json({ error: 'Unable to create student' });
  }
});

app.post('/requests', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Only teachers and admins can request new students' });
    }

    const { student_email, student_name, requested_role } = req.body;
    if (!student_email) {
      return res.status(400).json({ error: 'Student email is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('join_requests')
      .insert({
        requested_by: currentUser.authUser.id,
        student_email: student_email.toLowerCase(),
        student_name,
        requested_role: requested_role === 'teacher' ? 'teacher' : 'student',
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ request: data });
  } catch (error) {
    console.error('create request error', error);
    return res.status(500).json({ error: 'Unable to create request' });
  }
});

app.get('/admin/requests', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabaseAdmin
      .from('join_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ requests: data });
  } catch (error) {
    console.error('fetch requests error', error);
    return res.status(500).json({ error: 'Unable to fetch requests' });
  }
});

app.patch('/requests/:id/approve', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const requestId = req.params.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required for approval' });
    }

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (requestError || !requestRow) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (requestRow.status !== 'pending') {
      return res.status(400).json({ error: 'Request is already processed' });
    }

    const studentEmail = requestRow.student_email.toLowerCase();
    const studentRole = requestRow.requested_role || 'student';

    let authUser = await findAuthUserByEmail(studentEmail);
    if (!authUser) {
      const createResult = await (supabaseAdmin.auth.admin as any).createUser({
        email: studentEmail,
        password,
      });
      if (createResult.error) {
        return res.status(500).json({ error: createResult.error.message || 'Failed to create auth user' });
      }
      authUser = createResult.data.user;
    } else {
      const updateResult = await (supabaseAdmin.auth.admin as any).updateUserById(authUser.id, { password });
      if (updateResult.error) {
        return res.status(500).json({ error: updateResult.error.message || 'Failed to update password' });
      }
    }

    await createOrUpdateUserRecord(authUser.id, studentEmail, studentRole, true, true);

    const { data: approvedRequest, error: approvalError } = await supabaseAdmin
      .from('join_requests')
      .update({ status: 'approved', review_notes: 'Approved by admin', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .single();

    if (approvalError) {
      return res.status(500).json({ error: approvalError.message });
    }

    return res.json({ request: approvedRequest });
  } catch (error) {
    console.error('approve request error', error);
    return res.status(500).json({ error: 'Unable to approve request' });
  }
});

app.patch('/requests/:id/decline', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const requestId = req.params.id;
    const { review_notes } = req.body;

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from('join_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (requestError || !requestRow) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { data: declinedRequest, error: declinedError } = await supabaseAdmin
      .from('join_requests')
      .update({ status: 'declined', review_notes: review_notes || 'Declined by admin', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .single();

    if (declinedError) {
      return res.status(500).json({ error: declinedError.message });
    }

    return res.json({ request: declinedRequest });
  } catch (error) {
    console.error('decline request error', error);
    return res.status(500).json({ error: 'Unable to decline request' });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, admin_type, can_login, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ users: data });
  } catch (error) {
    console.error('fetch users error', error);
    return res.status(500).json({ error: 'Unable to fetch users' });
  }
});

app.patch('/admin/users/:id', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.id;
    const { can_login, password } = req.body;
    const updatePayload: Record<string, any> = {};
    if (typeof can_login === 'boolean') updatePayload.can_login = can_login;

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ ...updatePayload, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    if (password) {
      const updateResult = await (supabaseAdmin.auth.admin as any).updateUserById(userId, { password });
      if (updateResult.error) {
        return res.status(500).json({ error: updateResult.error.message || 'Unable to update password' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, can_login, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ user: data });
  } catch (error) {
    console.error('update user error', error);
    return res.status(500).json({ error: 'Unable to update user' });
  }
});

// Admin endpoint to create a new teacher
app.post('/admin/teachers', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create auth user
    const { data: authUser, error: authError } = await (supabaseAdmin.auth.admin as any).createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message || 'Failed to create teacher account' });
    }

    if (!authUser?.user?.id) {
      return res.status(500).json({ error: 'Failed to create teacher account' });
    }

    // Create user profile as teacher (auto-approved)
    const { data: createdTeacher, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: email.toLowerCase(),
        role: 'teacher',
        full_name: full_name || email.split('@')[0],
        can_login: true,
        approved: true,
      })
      .select('*')
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Failed to create teacher profile' });
    }

    return res.status(201).json({ teacher: createdTeacher });
  } catch (error) {
    console.error('create teacher error', error);
    return res.status(500).json({ error: 'Unable to create teacher' });
  }
});

// Admin endpoint to create a new user (teacher or admin)
app.post('/admin/users', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, password, full_name, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }
    if (!['teacher', 'admin', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher, admin, or student' });
    }

    if (role === 'admin' && currentUser.userRow?.admin_type !== 'main') {
      return res.status(403).json({ error: 'Only the main admin can create additional admin accounts' });
    }

    const { count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    const isFirstAdmin = !count || count === 0;
    const adminType = role === 'admin' ? (isFirstAdmin ? 'main' : 'section') : undefined;

    const { data: authUser, error: authError } = await (supabaseAdmin.auth.admin as any).createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message || 'Failed to create user account' });
    }

    if (!authUser?.user?.id) {
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    const insertData: any = {
      id: authUser.user.id,
      email: email.toLowerCase(),
      role,
      full_name: full_name || email.split('@')[0],
      can_login: true,
      approved: true,
    };

    if (adminType) {
      insertData.admin_type = adminType;
    }

    const { data: createdUser, error: profileError } = await supabaseAdmin
      .from('users')
      .insert(insertData)
      .select('*')
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    return res.status(201).json({ user: createdUser });
  } catch (error) {
    console.error('create user error', error);
    return res.status(500).json({ error: 'Unable to create user' });
  }
});

app.delete('/admin/users/:id', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (userId === currentUser.authUser.id) {
      return res.status(400).json({ error: 'Admins cannot delete themselves' });
    }

    const { error: deleteAuthError } = await (supabaseAdmin.auth.admin as any).deleteUser(userId);
    if (deleteAuthError) {
      return res.status(500).json({ error: deleteAuthError.message || 'Unable to delete auth user' });
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      return res.status(500).json({ error: deleteProfileError.message || 'Unable to delete user profile' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('delete user error', error);
    return res.status(500).json({ error: 'Unable to delete user' });
  }
});

// Admin endpoint to get all teachers
app.get('/admin/teachers', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.userRow?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, can_login, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ teachers: data });
  } catch (error) {
    console.error('fetch teachers error', error);
    return res.status(500).json({ error: 'Unable to fetch teachers' });
  }
});

app.get('/reminders', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const user = await verifySupabaseToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
      .from('reminders')
      .select('*, creator:creator_id(id, email, full_name), target:target_user_id(id, email, full_name)')
      .or(`creator_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .order('remind_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ reminders: data });
  } catch (error) {
    console.error('fetch reminders error', error);
    return res.status(500).json({ error: 'Unable to fetch reminders' });
  }
});

app.post('/attendance', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { room_id, joined_at, left_at, status } = req.body;
    if (!room_id || !joined_at) {
      return res.status(400).json({ error: 'Room ID and join time are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id: currentUser.authUser.id,
        room_id,
        joined_at,
        left_at,
        status,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ attendance: data });
  } catch (error) {
    console.error('create attendance error', error);
    return res.status(500).json({ error: 'Unable to record attendance' });
  }
});

app.post('/assignments', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { title, description, due_date, room_id, assignment_url } = req.body;
    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('assignments')
      .insert({
        title,
        description,
        due_date,
        room_id,
        assignment_url,
        created_by: currentUser.authUser.id,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ assignment: data });
  } catch (error) {
    console.error('create assignment error', error);
    return res.status(500).json({ error: 'Unable to create assignment' });
  }
});

app.get('/assignments', async (req, res) => {
  try {
    const roomId = req.query.room_id as string | undefined;
    let query = supabaseAdmin.from('assignments').select('*');
    if (roomId) query = query.eq('room_id', roomId);
    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ assignments: data });
  } catch (error) {
    console.error('fetch assignments error', error);
    return res.status(500).json({ error: 'Unable to fetch assignments' });
  }
});

app.get('/submissions', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const assignmentId = req.query.assignment_id as string | undefined;
    const studentId = req.query.student_id as string | undefined;
    let query = supabaseAdmin.from('submissions').select('*');

    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ submissions: data });
  } catch (error) {
    console.error('fetch submissions error', error);
    return res.status(500).json({ error: 'Unable to fetch submissions' });
  }
});

app.patch('/submissions/:id/grade', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const submissionId = req.params.id;
    const { grade, feedback } = req.body;
    if (grade === undefined || grade === null) {
      return res.status(400).json({ error: 'Grade is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('submissions')
      .update({ feedback, grade })
      .eq('id', submissionId)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const submissionData = data as any;
    if (submissionData) {
      await supabaseAdmin.from('grades').insert({
        student_id: submissionData.student_id,
        assignment_id: submissionData.assignment_id,
        room_id: null,
        grade,
        feedback,
        graded_by: currentUser.authUser.id,
      });
    }

    return res.json({ submission: data });
  } catch (error) {
    console.error('grade submission error', error);
    return res.status(500).json({ error: 'Unable to grade submission' });
  }
});

app.get('/attendance', async (req, res) => {
  try {
    const roomId = req.query.room_id as string | undefined;
    const studentId = req.query.student_id as string | undefined;
    let query = supabaseAdmin.from('attendance').select('*');

    if (roomId) query = query.eq('room_id', roomId);
    if (studentId) query = query.eq('user_id', studentId);

    const { data, error } = await query.order('joined_at', { ascending: false });
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ attendance: data });
  } catch (error) {
    console.error('fetch attendance error', error);
    return res.status(500).json({ error: 'Unable to fetch attendance' });
  }
});

app.get('/analytics/student/:id', async (req, res) => {
  try {
    const studentId = req.params.id;

    const [gradesRes, attendanceRes] = await Promise.all([
      supabaseAdmin.from('grades').select('grade, feedback, assignment_id, room_id').eq('student_id', studentId),
      supabaseAdmin.from('attendance').select('id').eq('user_id', studentId),
    ]);

    if (gradesRes.error || attendanceRes.error) {
      return res.status(500).json({ error: gradesRes.error?.message || attendanceRes.error?.message });
    }

    const grades = gradesRes.data || [];
    const averageGrade = grades.length ? grades.reduce((sum, item) => sum + Number(item.grade), 0) / grades.length : 0;
    return res.json({
      averageGrade,
      grades,
      attendanceCount: attendanceRes.data?.length || 0,
    });
  } catch (error) {
    console.error('student analytics error', error);
    return res.status(500).json({ error: 'Unable to load analytics' });
  }
});

app.get('/analytics/teacher/:id', async (req, res) => {
  try {
    const teacherId = req.params.id;

    const [sessionsRes, submissionsRes, reviewsRes] = await Promise.all([
      supabaseAdmin.from('classroom_sessions').select('id').eq('teacher_id', teacherId),
      supabaseAdmin.from('teacher_reviews').select('rating').eq('teacher_id', teacherId),
      supabaseAdmin.from('assignments').select('id').eq('created_by', teacherId),
    ]);

    if (sessionsRes.error || submissionsRes.error || reviewsRes.error) {
      return res.status(500).json({ error: sessionsRes.error?.message || submissionsRes.error?.message || reviewsRes.error?.message });
    }

    const reviews = (reviewsRes.data as unknown as Array<{ rating: number }>) || [];
    const averageRating = reviews.length ? reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length : 0;

    return res.json({
      sessionCount: sessionsRes.data?.length || 0,
      assignmentCount: submissionsRes.data?.length || 0,
      averageRating,
      reviews,
    });
  } catch (error) {
    console.error('teacher analytics error', error);
    return res.status(500).json({ error: 'Unable to load analytics' });
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
      .from('email_notifications')
      .select('*')
      .or(`user_id.eq.${currentUser.authUser.id},recipient_email.eq.${currentUser.authUser.email}`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ notifications: data });
  } catch (error) {
    console.error('fetch notifications error', error);
    return res.status(500).json({ error: 'Unable to fetch notifications' });
  }
});

app.post('/notifications', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { recipient_email, subject, type, message } = req.body;
    if (!recipient_email || !subject || !type) {
      return res.status(400).json({ error: 'recipient_email, subject, and type are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('email_notifications')
      .insert({
        user_id: currentUser.authUser.id,
        recipient_email: recipient_email.toLowerCase(),
        subject,
        type,
        message,
        sent: false,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ notification: data });
  } catch (error) {
    console.error('create notification error', error);
    return res.status(500).json({ error: 'Unable to create notification' });
  }
});

app.get('/articles', async (req, res) => {
  try {
    const roomId = req.query.room_id as string | undefined;
    let query = supabaseAdmin.from('articles').select('*');
    if (roomId) query = query.eq('room_id', roomId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ articles: data });
  } catch (error) {
    console.error('fetch articles error', error);
    return res.status(500).json({ error: 'Unable to fetch articles' });
  }
});

app.post('/articles', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { title, content, file_url, room_id } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        title,
        content,
        file_url,
        room_id,
        created_by: currentUser.authUser.id,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ article: data });
  } catch (error) {
    console.error('create article error', error);
    return res.status(500).json({ error: 'Unable to create article' });
  }
});

app.get('/events', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('scheduled_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ events: data });
  } catch (error) {
    console.error('fetch events error', error);
    return res.status(500).json({ error: 'Unable to fetch events' });
  }
});

app.post('/events', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { title, description, event_date, event_type, room_id, recurrence } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and event date are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('scheduled_events')
      .insert({
        creator_id: currentUser.authUser.id,
        title,
        description,
        event_date,
        event_type,
        room_id,
        recurrence,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ event: data });
  } catch (error) {
    console.error('create event error', error);
    return res.status(500).json({ error: 'Unable to create event' });
  }
});

app.get('/certificates', async (req, res) => {
  try {
    const studentId = req.query.student_id as string | undefined;
    let query = supabaseAdmin.from('certificates').select('*');
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query.order('issued_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ certificates: data });
  } catch (error) {
    console.error('fetch certificates error', error);
    return res.status(500).json({ error: 'Unable to fetch certificates' });
  }
});

app.post('/certificates', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { student_id, course_id, title, certificate_url } = req.body;
    if (!student_id || !title) {
      return res.status(400).json({ error: 'Student ID and title are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('certificates')
      .insert({
        student_id,
        course_id,
        title,
        issued_by: currentUser.authUser.id,
        certificate_url,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ certificate: data });
  } catch (error) {
    console.error('create certificate error', error);
    return res.status(500).json({ error: 'Unable to create certificate' });
  }
});

app.get('/recordings', async (req, res) => {
  try {
    const roomId = req.query.room_id as string | undefined;
    let query = supabaseAdmin.from('session_recordings').select('*');
    if (roomId) query = query.eq('room_id', roomId);
    const { data, error } = await query.order('recorded_at', { ascending: false });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ recordings: data });
  } catch (error) {
    console.error('fetch recordings error', error);
    return res.status(500).json({ error: 'Unable to fetch recordings' });
  }
});

app.post('/recordings', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { room_id, recording_url, duration_seconds } = req.body;
    if (!room_id || !recording_url) {
      return res.status(400).json({ error: 'Room id and recording url are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('session_recordings')
      .insert({
        room_id,
        recording_url,
        duration_seconds,
        recorded_by: currentUser.authUser.id,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ recording: data });
  } catch (error) {
    console.error('create recording error', error);
    return res.status(500).json({ error: 'Unable to create recording' });
  }
});

app.get('/direct-messages', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const peerId = req.query.peer_id as string | undefined;
    let query = supabaseAdmin
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.authUser.id},recipient_id.eq.${currentUser.authUser.id}`)
      .order('created_at', { ascending: true });

    if (peerId) {
      query = supabaseAdmin
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUser.authUser.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${currentUser.authUser.id})`
        )
        .order('created_at', { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ messages: data });
  } catch (error) {
    console.error('fetch direct messages error', error);
    return res.status(500).json({ error: 'Unable to fetch direct messages' });
  }
});

app.post('/direct-messages', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipient_id, message } = req.body;
    if (!recipient_id || !message) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('direct_messages')
      .insert({ sender_id: currentUser.authUser.id, recipient_id, message })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ message: data });
  } catch (error) {
    console.error('create direct message error', error);
    return res.status(500).json({ error: 'Unable to create message' });
  }
});

app.get('/parent-relations', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
      .from('parent_students')
      .select('*, student:student_id(id, email, full_name), parent:parent_id(id, email, full_name)')
      .or(`parent_id.eq.${currentUser.authUser.id},student_id.eq.${currentUser.authUser.id}`);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ relations: data });
  } catch (error) {
    console.error('fetch parent relations error', error);
    return res.status(500).json({ error: 'Unable to fetch parent relations' });
  }
});

app.post('/parent-relations', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parent_id, student_id, relationship, verified } = req.body;
    if (!parent_id || !student_id) {
      return res.status(400).json({ error: 'Parent and student IDs are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('parent_students')
      .insert({ parent_id, student_id, relationship, verified: !!verified })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ relation: data });
  } catch (error) {
    console.error('create parent relation error', error);
    return res.status(500).json({ error: 'Unable to create relation' });
  }
});

app.get('/announcements', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ announcements: data });
  } catch (error) {
    console.error('fetch announcements error', error);
    return res.status(500).json({ error: 'Unable to fetch announcements' });
  }
});

app.post('/announcements', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!['teacher', 'admin'].includes(currentUser.userRow.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { title, message, audience, pinned } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        message,
        created_by: currentUser.authUser.id,
        audience: audience || 'all',
        pinned: !!pinned,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ announcement: data });
  } catch (error) {
    console.error('create announcement error', error);
    return res.status(500).json({ error: 'Unable to create announcement' });
  }
});

app.get('/teacher-reviews', async (req, res) => {
  try {
    const teacherId = req.query.teacher_id as string | undefined;
    let query = supabaseAdmin.from('teacher_reviews').select('*');
    if (teacherId) query = query.eq('teacher_id', teacherId);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ reviews: data });
  } catch (error) {
    console.error('fetch teacher reviews error', error);
    return res.status(500).json({ error: 'Unable to fetch reviews' });
  }
});

app.post('/teacher-reviews', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { teacher_id, rating, review } = req.body;
    if (!teacher_id || !rating) {
      return res.status(400).json({ error: 'Teacher ID and rating are required' });
    }
    if (currentUser.userRow.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit reviews' });
    }

    const { data, error } = await supabaseAdmin
      .from('teacher_reviews')
      .insert({
        teacher_id,
        student_id: currentUser.authUser.id,
        rating,
        review,
      })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ review: data });
  } catch (error) {
    console.error('create teacher review error', error);
    return res.status(500).json({ error: 'Unable to create teacher review' });
  }
});

app.post('/twofactor/request', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('two_factor_codes')
      .insert({ user_id: currentUser.authUser.id, code, expires_at: expiresAt })
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ code: code, expires_at: expiresAt, note: 'Use this code to complete 2FA verification. In production, send it via email or SMS.' });
  } catch (error) {
    console.error('twofactor request error', error);
    return res.status(500).json({ error: 'Unable to request two-factor code' });
  }
});

app.post('/twofactor/verify', async (req, res) => {
  try {
    const authHeader = (req.headers.authorization as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
    const currentUser = await getUserFromToken(token);
    if (!currentUser || !currentUser.userRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', currentUser.authUser.id)
      .eq('code', code)
      .eq('used', false)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    if (new Date(data.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Two-factor code expired' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', data.id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({ verified: true });
  } catch (error) {
    console.error('twofactor verify error', error);
    return res.status(500).json({ error: 'Unable to verify two-factor code' });
  }
});

server.listen(PORT, () => {
  console.log(`DCONS backend running on http://localhost:${PORT}`);
});
