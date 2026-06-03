'use client';

import { useMemo, useState } from 'react';
import { LogOut, Mic2, MicOff, Video, VideoOff, MessageCircle, ShieldAlert, Users, Sparkles, Monitor } from 'lucide-react';
import { useMediasoupRoom } from '@/hooks/useMediasoupRoom';
import Whiteboard from './Whiteboard';

type Session = {
  role: 'teacher' | 'student';
  name: string;
  subject?: string;
  title?: string;
  classTitle?: string;
  classTopic?: string;
  instructor?: string;
  roomName: string;
};

export default function MediaClassroom({ session }: { session: Session }) {
  const [message, setMessage] = useState('');
  const {
    localStream,
    screenStream,
    remoteStreams,
    chatMessages,
    attendance,
    isConnected,
    isReady,
    error,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    moderationAlerts,
    whiteboardSnapshot,
    whiteboardUpdatedBy,
    sendMessage,
    sendWhiteboardSnapshot,
    toggleAudio,
    toggleVideo,
    shareScreen,
    stopScreenShare,
    leaveRoom,
  } = useMediasoupRoom({
    roomName: session.roomName,
    name: session.name,
    role: session.role,
  });

  const logout = () => {
    leaveRoom();
    localStorage.removeItem('dconsSession');
    window.location.href = '/';
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;

    await sendMessage(message.trim());
    setMessage('');
  };

  const statusText = useMemo(() => {
    if (error) return `Error: ${error}`;
    if (!isConnected) return 'Disconnected';
    if (!isReady) return 'Connecting…';
    if (isScreenSharing) return 'Screen sharing';
    return 'Live';
  }, [error, isConnected, isReady, isScreenSharing]);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen p-8">
      <header className="border-b border-slate-800 pb-6 mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-black">{session.classTitle}</h1>
          <p className="text-slate-400 mt-2">{session.classTopic}</p>
          <p className="text-slate-500 mt-1">Instructor: {session.instructor || session.name}</p>
        </div>

        <div className="flex flex-col gap-4 items-start sm:items-end">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            <span className="h-3 w-3 rounded-full bg-green-400" />
            {statusText}
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl bg-slate-900 p-6 shadow-xl shadow-slate-950/20">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Classroom Media</h2>
                <p className="text-slate-400 mt-2">Video, audio and attendance are routed through the Mediasoup backend.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800"
                >
                  {isAudioEnabled ? <Mic2 size={16} /> : <MicOff size={16} />}
                  {isAudioEnabled ? 'Mute' : 'Unmute'}
                </button>
                <button
                  type="button"
                  onClick={toggleVideo}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800"
                >
                  {isVideoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                  {isVideoEnabled ? 'Hide video' : 'Show video'}
                </button>
                <button
                  type="button"
                  onClick={isScreenSharing ? stopScreenShare : shareScreen}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800"
                >
                  <Monitor size={16} />
                  {isScreenSharing ? 'Stop sharing' : 'Share screen'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <h3 className="text-lg font-semibold mb-4">Your Stream</h3>
                  <div className="rounded-3xl overflow-hidden bg-black">
                    {localStream ? (
                      <video
                        autoPlay
                        muted
                        playsInline
                        controls={false}
                        className="h-80 w-full object-cover"
                        ref={(video) => {
                          if (video) video.srcObject = localStream;
                        }}
                      />
                    ) : (
                      <div className="flex h-80 items-center justify-center bg-slate-900 text-slate-500">
                        Waiting for camera access…
                      </div>
                    )}
                  </div>
                </div>

                {screenStream ? (
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="text-lg font-semibold mb-4">Screen Share Preview</h3>
                    <div className="rounded-3xl overflow-hidden bg-black">
                      <video
                        autoPlay
                        muted
                        playsInline
                        controls={false}
                        className="h-80 w-full object-cover"
                        ref={(video) => {
                          if (video) video.srcObject = screenStream;
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  {remoteStreams.filter((stream) => stream.kind === 'video').map((stream) => (
                    <div key={stream.id} className="rounded-3xl overflow-hidden bg-black">
                      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 text-sm text-slate-300">
                        {stream.label}
                      </div>
                      <video
                        autoPlay
                        playsInline
                        muted={false}
                        controls={false}
                        className="h-64 w-full object-cover"
                        ref={(video) => {
                          if (video) video.srcObject = stream.stream;
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-100">
                <div className="mb-5 flex items-center gap-3">
                  <Users size={20} className="text-cyan-400" />
                  <div>
                    <p className="font-semibold text-white">Attendance</p>
                    <p className="text-slate-400 text-sm">Live roster and presence</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-105 overflow-y-auto pr-2">
                  {attendance.length > 0 ? (
                    attendance.map((attendee) => (
                      <div key={attendee.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{attendee.name}</p>
                            <p className="text-slate-500 text-sm">{attendee.role}</p>
                          </div>
                          <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950">Present</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Joined at {new Date(attendee.joinedAt).toLocaleTimeString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-500">
                      No attendees yet. Waiting for participants to join.
                    </div>
                  )}
                </div>

                {moderationAlerts.length > 0 && (
                  <div className="mt-5 rounded-3xl border border-red-500 bg-red-950/40 p-4 text-sm text-red-200">
                    <div className="flex items-center gap-2 font-semibold text-red-200">
                      <ShieldAlert size={16} /> Moderation Alerts
                    </div>
                    <ul className="mt-3 space-y-2">
                      {moderationAlerts.slice(-3).map((alert, index) => (
                        <li key={index} className="text-slate-300">{alert}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-slate-900 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-semibold">Classroom Tools</h2>
                <p className="text-slate-400 mt-1">Chat, whiteboard, and teacher controls for active sessions.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-300">
                <Sparkles size={16} /> AI-assisted moderation
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                  <div className="mb-4 flex items-center gap-3 text-slate-100">
                    <MessageCircle size={20} className="text-cyan-400" />
                    <h3 className="font-semibold">Class Chat</h3>
                  </div>

                  <div className="space-y-3 max-h-85 overflow-y-auto pr-2">
                    {chatMessages.map((chat) => (
                      <div
                        key={chat.id}
                        className={`rounded-3xl p-4 ${chat.role === 'teacher' ? 'bg-cyan-950/80' : 'bg-slate-900'} ${chat.flagged ? 'border border-red-500' : 'border border-slate-800'}`}
                      >
                        <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                          <span className="font-semibold text-slate-100">{chat.sender}</span>
                          <span>{chat.time}</span>
                        </div>
                        <p className="mt-2 text-slate-200">{chat.message}</p>
                        {chat.flagged && <p className="mt-2 text-xs text-red-300">Flagged by moderation</p>}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="mt-4 flex gap-3">
                    <input
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className="min-w-0 flex-1 rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
                      placeholder="Send a class message"
                    />
                    <button type="submit" className="rounded-3xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500">
                      Send
                    </button>
                  </form>
                </div>

                <Whiteboard
                  incomingSnapshot={whiteboardSnapshot}
                  onSnapshot={sendWhiteboardSnapshot}
                />
                {whiteboardUpdatedBy ? (
                  <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
                    Updated by: <span className="font-semibold text-white">{whiteboardUpdatedBy}</span>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 flex items-center gap-3 text-slate-100">
                  <Users size={20} className="text-cyan-400" />
                  <h3 className="font-semibold">Quick Actions</h3>
                </div>
                <div className="space-y-3 text-slate-300">
                  <p>Use the moderation alerts and attendance roster to manage the room.</p>
                  <p>Audio and video are routed through Mediasoup for low-latency SFU delivery.</p>
                  <p className="text-sm text-slate-500">Teachers can monitor active participants and review flagged messages.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/20">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert size={20} className="text-cyan-400" />
              <div>
                <h3 className="font-semibold">Class Summary</h3>
                <p className="text-slate-400 text-sm">Realtime attendance and moderation insights.</p>
              </div>
            </div>
            <div className="space-y-3 text-slate-300">
              <p>
                <span className="font-semibold text-white">Role:</span> {session.role}
              </p>
              <p>
                <span className="font-semibold text-white">Teacher:</span> {session.instructor || 'Self'}
              </p>
              <p>
                <span className="font-semibold text-white">Participants:</span> {attendance.length}
              </p>
              <p>
                <span className="font-semibold text-white">Video:</span> {isVideoEnabled ? 'On' : 'Off'}
              </p>
              <p>
                <span className="font-semibold text-white">Audio:</span> {isAudioEnabled ? 'On' : 'Off'}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-3xl border border-red-500 bg-red-950/30 p-5 text-sm text-red-200">
              <p className="font-semibold">Connection issue</p>
              <p>{error}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
