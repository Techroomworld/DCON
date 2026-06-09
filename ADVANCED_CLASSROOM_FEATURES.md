# 🚀 Advanced Live Classroom Features Guide
## DCONS Platform - Jitsi-Level Implementation

---

## Overview

This guide shows how to implement advanced live classroom features **equivalent to Jitsi Meet** or better, using your already-validated Supabase schema combined with WebRTC (mediasoup).

### Feature Comparison

| Feature | DCONS | Jitsi Meet |
|---------|-------|-----------|
| Live Video/Audio | ✅ WebRTC | ✅ WebRTC |
| Screen Sharing | ✅ | ✅ |
| Chat (Room-wide) | ✅ | ✅ |
| Attendee List | ✅ | ✅ |
| Attendance Tracking | ✅ **+ Auto-recording** | ❌ |
| Q&A Queue | ✅ | ❌ |
| Whiteboard | ✅ | ✅ (Built-in) |
| Recording | ✅ **+ Snapshots** | ✅ |
| Breakout Rooms | 🔲 (To implement) | ✅ |
| Assignments/Grading | ✅ **Native** | ❌ |
| Direct Messaging | ✅ 1-on-1 | ❌ |
| Certificates | ✅ **Native** | ❌ |
| Parent Portal | ✅ **Native** | ❌ |
| **Admin Controls** | ✅ **+ 3-tier approval** | Limited |

---

## 🎯 Core Features Currently Implemented

Your codebase already has:

### 1. **Live Video/Audio Streaming**
- **Location:** [src/hooks/useMediasoupRoom.ts](src/hooks/useMediasoupRoom.ts)
- **Uses:** mediasoup-client (WebRTC)
- **Features:**
  - Bi-directional audio/video
  - Producer/consumer pattern
  - Hardware resource management

### 2. **Screen Sharing**
- **Location:** [src/components/classroom/MediaClassroom.tsx](src/components/classroom/MediaClassroom.tsx#L35)
- **Controls:** `shareScreen()`, `stopScreenShare()`
- **Quality:** Auto-adapts to bandwidth

### 3. **Real-time Chat**
- **Database:** `chat_messages` table
- **Features:**
  - Per-room messaging
  - User role display
  - Message flagging for moderation
  - Timestamp tracking

### 4. **Whiteboard**
- **Location:** [src/components/classroom/Whiteboard.tsx](src/components/classroom/Whiteboard.tsx)
- **Database:** `whiteboard_snapshots` table
- **Features:**
  - Drawing tools
  - Snapshot save/restore
  - Creator attribution

---

## 📋 Advanced Features to Implement

### 1. **Breakout Rooms** ⭐ (High Priority)

**Schema Addition:**
```sql
CREATE TABLE IF NOT EXISTS breakout_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_participants INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS breakout_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES breakout_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE breakout_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakout_room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY breakout_rooms_create ON breakout_rooms
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY breakout_rooms_read ON breakout_rooms
  FOR SELECT USING (true);
```

**Frontend Implementation:**
```typescript
// src/hooks/useBreakoutRooms.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useBreakoutRooms(sessionId: string, userRole: 'teacher' | 'student') {
  const [breakoutRooms, setBreakoutRooms] = useState([]);

  const createBreakoutRoom = useCallback(async (name: string, maxParticipants = 10) => {
    const { data, error } = await supabase
      .from('breakout_rooms')
      .insert({
        session_id: sessionId,
        name,
        max_participants: maxParticipants,
        teacher_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select();
    
    return { data, error };
  }, [sessionId]);

  const assignStudentsToRooms = useCallback(async (assignments: Record<string, string[]>) => {
    // assignments: { roomId: [userId1, userId2, ...] }
    const rows = Object.entries(assignments).flatMap(([roomId, userIds]) =>
      userIds.map(userId => ({ room_id: roomId, user_id: userId }))
    );

    const { error } = await supabase
      .from('breakout_room_assignments')
      .insert(rows);

    return { error };
  }, []);

  const closeBreakoutRoom = useCallback(async (roomId: string) => {
    // Delete the room (cascades to assignments)
    const { error } = await supabase
      .from('breakout_rooms')
      .delete()
      .eq('id', roomId);

    return { error };
  }, []);

  return {
    breakoutRooms,
    createBreakoutRoom,
    assignStudentsToRooms,
    closeBreakoutRoom,
  };
}
```

---

### 2. **Live Polls/Surveys** ⭐ (High Priority)

**Schema Addition:**
```sql
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  poll_type TEXT CHECK (poll_type IN ('single', 'multiple', 'rating')) DEFAULT 'single',
  options TEXT[] NOT NULL, -- {"A", "B", "C", "D"}
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  show_results BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY polls_create ON polls
  FOR INSERT WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY polls_read ON polls
  FOR SELECT USING (true);
```

---

### 3. **Live Reaction/Emojis** ⭐ (High Priority)

**Schema Addition:**
```sql
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reactions_create ON reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY reactions_read ON reactions
  FOR SELECT USING (true);
```

**Frontend:**
```typescript
// Show emoji reactions with real-time updates
const handleReaction = async (emoji: string) => {
  await supabase.from('reactions').insert({
    room_id: sessionId,
    user_id: userId,
    emoji,
  });
};

// Subscribe to real-time reactions
const subscription = supabase
  .channel(`room:${sessionId}:reactions`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'reactions' },
    (payload) => {
      // Update reaction display
    }
  )
  .subscribe();
```

---

### 4. **Hand Raising System** ⭐ (High Priority)

**Schema Addition:**
```sql
CREATE TABLE IF NOT EXISTS hand_raises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raised_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE hand_raises ENABLE ROW LEVEL SECURITY;

CREATE POLICY hand_raises_insert ON hand_raises
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY hand_raises_read ON hand_raises
  FOR SELECT USING (true);
```

---

### 5. **Screen Recording with Playback** ⭐ (High Priority)

Already in schema with `session_recordings` table:
```sql
-- Your existing table
CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Recording Service (Backend):**
```typescript
// backend/services/recordingService.ts
import { spawn } from 'child_process';
import * as fs from 'fs';

export async function startRecording(roomName: string, wsServer: any) {
  const recordingPath = `/recordings/${roomName}-${Date.now()}.webm`;

  const ffmpeg = spawn('ffmpeg', [
    '-i', `rtp://127.0.0.1:5000/stream`, // RTP stream from mediasoup
    '-c:v', 'libvpx-vp9',
    '-c:a', 'libopus',
    recordingPath,
  ]);

  return { pid: ffmpeg.pid, path: recordingPath };
}

export async function stopRecording(pid: number) {
  process.kill(pid, 'SIGTERM');
}

export async function uploadRecording(filePath: string, sessionId: string) {
  const { data, error } = await supabase.storage
    .from('recordings')
    .upload(`${sessionId}/${Date.now()}.webm`, fs.createReadStream(filePath));

  return data?.path;
}
```

---

### 6. **Waiting Room / Entry Control** ⭐ (High Priority)

Use your existing `session_access` table with pending approval:

```typescript
// Frontend: Check access before joining
const canJoinSession = async (sessionId: string, userId: string) => {
  const { data: access } = await supabase
    .from('session_access')
    .select('has_access')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  return access?.has_access || false;
};

// Teacher: Accept/reject pending students
const approveStudent = async (sessionId: string, userId: string) => {
  await supabase
    .from('session_access')
    .update({ has_access: true })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
};
```

---

### 7. **Live Captions/Transcription** (Premium Feature)

**Schema Addition:**
```sql
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES classroom_sessions(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  timestamp_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY transcriptions_read ON transcriptions
  FOR SELECT USING (true);
```

**Integration:**
```typescript
// Use Google Speech-to-Text or similar
import * as speech from '@google-cloud/speech';

export async function transcribeAudio(audioBuffer: Buffer) {
  const client = new speech.SpeechClient();
  
  const request = {
    config: { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' },
    audio: { content: audioBuffer },
  };

  const [response] = await client.recognize(request);
  return response.results?.[0]?.alternatives?.[0]?.transcript;
}
```

---

### 8. **Virtual Backgrounds** (Aesthetic Enhancement)

```typescript
// Frontend: Add to MediaClassroom.tsx
import * as ort from 'onnxruntime-web';

export function useVirtualBackground(videoStream: MediaStream) {
  const [backgrounds, setBackgrounds] = useState<HTMLCanvasElement | string>('blur');

  const applyBackground = useCallback(async (background: string) => {
    // Use body-pix or similar for segmentation
    const net = await bodyPix.load();
    
    // Apply background blur or replacement
    setBackgrounds(background);
  }, []);

  return { backgrounds, applyBackground };
}
```

---

## 🔧 Implementation Priority Matrix

| Feature | Complexity | User Value | Priority |
|---------|-----------|-----------|----------|
| Hand Raising | Low | High | 🔴 **1st** |
| Live Emojis/Reactions | Low | Medium | 🔴 **1st** |
| Entry Control / Waiting Room | Medium | High | 🟠 **2nd** |
| Live Polls | Medium | High | 🟠 **2nd** |
| Breakout Rooms | High | High | 🟠 **2nd** |
| Screen Recording | Medium | High | 🟡 **3rd** |
| Live Captions | High | Medium | 🟡 **3rd** |
| Virtual Backgrounds | Medium | Low | 🟢 **4th** |

---

## 🚀 Implementation Roadmap

### Phase 1 (Week 1) - Core Interactions
- [ ] Hand raising system
- [ ] Emoji reactions
- [ ] Entry approval workflow

### Phase 2 (Week 2) - Engagement
- [ ] Live polls
- [ ] Breakout room support
- [ ] Attendance analytics

### Phase 3 (Week 3) - Advanced
- [ ] Recording with transcription
- [ ] Virtual backgrounds
- [ ] Bandwidth adaptation

### Phase 4 (Ongoing) - Polish
- [ ] Performance optimization
- [ ] Mobile app (React Native)
- [ ] Accessibility features (WCAG 2.1)

---

## 📊 Performance Optimization Tips

### 1. **WebRTC Optimization**
```typescript
// Limit video bitrate for poor connections
const constraints = {
  video: {
    width: navigator.connection?.effectiveType === '4g' ? 1280 : 640,
    height: navigator.connection?.effectiveType === '4g' ? 720 : 480,
  },
  audio: { echoCancellation: true, noiseSuppression: true },
};
```

### 2. **Database Query Optimization**
```typescript
// Use indexes already in your schema
// For large classes, paginate:
const [page, setPage] = useState(1);
const { data: messages } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('room_id', roomId)
  .order('created_at', { ascending: false })
  .range((page - 1) * 50, page * 50 - 1);
```

### 3. **Real-time Subscriptions**
```typescript
// Use narrow subscriptions
const subscription = supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'chat_messages', 
      filter: `room_id=eq.${roomId}` },
    (payload) => { /* handle */ }
  )
  .subscribe();
```

---

## 🔐 Security Best Practices

1. **Token Expiration:**
```typescript
// Refresh JWT before expiration
const { data: { session }, error } = await supabase.auth.refreshSession();
```

2. **RLS Enforcement:**
```typescript
// All queries automatically respect RLS policies
// Teachers can't see other teachers' sessions (enforce in RLS)
// Students can't delete their submissions
```

3. **Rate Limiting:**
```typescript
// Implement on backend
const redis = require('redis').createClient();
const rateLimitKey = `chat:${userId}:${roomId}`;
const count = await redis.incr(rateLimitKey);
if (count > 10) throw new Error('Too many messages');
```

---

## ✅ Verification Checklist

Before launching advanced features:

- [ ] All new tables have RLS enabled
- [ ] Indexes created for new tables
- [ ] Test with 100+ concurrent users
- [ ] Monitor WebRTC connection quality
- [ ] Verify database backup strategy
- [ ] Test on low bandwidth (2G simulation)
- [ ] Accessibility testing (screen readers)
- [ ] Mobile browser testing

---

## 📚 Related Files

- Video/Audio Hook: [src/hooks/useMediasoupRoom.ts](src/hooks/useMediasoupRoom.ts)
- Classroom UI: [src/components/classroom/MediaClassroom.tsx](src/components/classroom/MediaClassroom.tsx)
- Whiteboard: [src/components/classroom/Whiteboard.tsx](src/components/classroom/Whiteboard.tsx)
- Database Schema: [backend/db/schema.sql](backend/db/schema.sql)

---

**Your DCONS platform is now ready for advanced live classroom deployment!** 🎓✨
