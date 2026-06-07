import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LogOut, Play, Plus, FileUp, UploadCloud, MessageSquare } from "lucide-react";

type SessionRecord = {
  id: string;
  title: string;
  description: string;
  room_name: string;
  status: string;
};

type QuestionRecord = {
  id: string;
  room_id: string;
  student_name: string;
  question: string;
  answer: string | null;
  is_answered: boolean;
};

type AssignmentFormState = {
  title: string;
  description: string;
  file_url: string;
  due_date: string;
};

export default function TeacherPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [email, setEmail] = useState("");
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [assignmentForms, setAssignmentForms] = useState<Record<string, AssignmentFormState>>({});
  const [assignmentActiveRoom, setAssignmentActiveRoom] = useState<string | null>(null);
  const [recordingForms, setRecordingForms] = useState<Record<string, { recording_url: string; duration: string }>>({});
  const [recordingActiveRoom, setRecordingActiveRoom] = useState<string | null>(null);
  const [recordingsByRoom, setRecordingsByRoom] = useState<Record<string, Array<{ id: string; recording_url: string; duration_seconds: number | null; created_at: string }>>>({});
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingStudents, setPendingStudents] = useState<Array<{ id: string; email: string; full_name?: string; created_at: string }>>([]);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (userData?.role === "admin") {
        navigate("/admin");
        return;
      }
      if (userData?.role !== "teacher") {
        navigate("/student");
        return;
      }

      setEmail(session.user.email || "");

      const { data } = await supabase
        .from("classroom_sessions")
        .select("*")
        .eq("teacher_id", session.user.id)
        .order("created_at", { ascending: false });

      const sessionRecords = data || [];
      setSessions(sessionRecords);

      if (sessionRecords.length > 0) {
        const roomIds = sessionRecords.map((item) => item.id);
        const { data: questionData } = await supabase
          .from("questions")
          .select("*")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false });
        setQuestions(questionData || []);

        const { data: recordingData } = await supabase
          .from('session_recordings')
          .select('*')
          .in('room_id', roomIds)
          .order('recorded_at', { ascending: false });

        const recordingMap: Record<string, Array<{ id: string; recording_url: string; duration_seconds: number | null; created_at: string }>> = {};
        (recordingData || []).forEach((recording: any) => {
          recordingMap[recording.room_id] = [...(recordingMap[recording.room_id] || []), recording];
        });
        setRecordingsByRoom(recordingMap);
      }

      await loadPendingStudents();
      setLoading(false);
    };

    init();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const loadPendingStudents = async () => {
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/students/pending`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to load pending students.');
        return;
      }
      setPendingStudents(result.students || []);
    } catch (err) {
      setError('Unable to load pending students.');
    }
  };

  const handleApproveStudent = async (studentId: string) => {
    setError(null);
    setMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/students/${studentId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to approve student.');
        return;
      }
      setMessage('Student approved successfully.');
      await loadPendingStudents();
    } catch (err) {
      setError('Unable to approve student.');
    }
  };

  const refreshSessions = async () => {
    const { data } = await supabase
      .from("classroom_sessions")
      .select("*")
      .eq("teacher_id", (await supabase.auth.getSession()).data?.session?.user.id)
      .order("created_at", { ascending: false });

    setSessions(data || []);
  };

  const handleCreateSession = async () => {
    if (!newRoomTitle.trim() || !newRoomName.trim()) {
      setError("Title and room name are required.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { error: insertError } = await supabase.from("classroom_sessions").insert({
      teacher_id: session.user.id,
      title: newRoomTitle.trim(),
      description: newRoomDescription.trim(),
      room_name: newRoomName.trim(),
      status: "active",
      started_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("Class session created successfully.");
    setNewRoomTitle("");
    setNewRoomName("");
    setNewRoomDescription("");
    setShowCreateSession(false);
    await refreshSessions();
  };

  const handleCreateAssignment = async (roomId: string) => {
    const form = assignmentForms[roomId];
    if (!form?.title.trim()) {
      setError("Assignment title is required.");
      return;
    }

    const { error: insertError } = await supabase.from("assignments").insert({
      room_id: roomId,
      title: form.title.trim(),
      description: form.description.trim(),
      file_url: form.file_url.trim() || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("Assignment uploaded successfully.");
    setAssignmentForms((prev) => ({
      ...prev,
      [roomId]: { title: "", description: "", file_url: "", due_date: "" },
    }));
    setAssignmentActiveRoom(null);
  };

  const handleCreateRecording = async (roomId: string) => {
    const form = recordingForms[roomId];
    if (!form?.recording_url?.trim()) {
      setError("Replay URL is required.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/recordings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          room_id: roomId,
          recording_url: form.recording_url.trim(),
          duration_seconds: form.duration ? Number(form.duration) : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to upload replay.');
        return;
      }

      setMessage('Replay uploaded successfully.');
      setRecordingForms((prev) => ({
        ...prev,
        [roomId]: { recording_url: '', duration: '' },
      }));
      setRecordingActiveRoom(null);
      const { data: recordingData } = await supabase
        .from('session_recordings')
        .select('*')
        .eq('room_id', roomId)
        .order('recorded_at', { ascending: false });

      const recordingMap = { ...(recordingsByRoom || {}) };
      recordingMap[roomId] = recordingData || [];
      setRecordingsByRoom(recordingMap);
    } catch (err) {
      console.error(err);
      setError('Unable to upload replay.');
    }
  };

  const handleAnswerQuestion = async (questionId: string, answer: string) => {
    if (!answer.trim()) {
      setError("Answer text cannot be empty.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("questions")
      .update({ answer: answer.trim(), is_answered: true, answered_by: session.user.id, answered_at: new Date().toISOString() })
      .eq("id", questionId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Question answered successfully.");
    setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
    setQuestions((current) => current.map((question) => (question.id === questionId ? { ...question, is_answered: true, answer: answer.trim() } : question)));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
            <p className="text-gray-600">{email}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateSession((current) => !current)}
              className="inline-flex items-center gap-2 bg-blue-600 px-5 py-3 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} /> {showCreateSession ? 'Cancel' : 'Create New Session'}
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-white rounded-lg hover:bg-red-700"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {message && <div className="rounded-3xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">{message}</div>}
        {error && <div className="rounded-3xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">{error}</div>}

        <section className="rounded-3xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Pending Student Approvals</h2>
              <p className="text-sm text-slate-500">Approve student accounts before they can join classes.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {pendingStudents.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-600">No pending student approvals.</div>
            ) : (
              pendingStudents.map((student) => (
                <div key={student.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{student.full_name || student.email}</p>
                    <p className="text-sm text-slate-500">{student.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApproveStudent(student.id)}
                    className="inline-flex items-center gap-2 rounded-3xl bg-green-600 px-5 py-3 text-white hover:bg-green-700"
                  >
                    Approve Student
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {showCreateSession && (
          <section className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-semibold text-slate-900">Create a new classroom session</h2>
            <div className="grid gap-6 mt-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Session title</label>
                <input
                  value={newRoomTitle}
                  onChange={(event) => setNewRoomTitle(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Advanced Math"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Room name</label>
                <input
                  value={newRoomName}
                  onChange={(event) => setNewRoomName(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="math-room-101"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={newRoomDescription}
                  onChange={(event) => setNewRoomDescription(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Enter session description or topic details."
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateSession}
              className="mt-6 inline-flex items-center gap-2 rounded-3xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-500"
            >
              <Plus size={18} /> Create session
            </button>
          </section>
        )}

        <div className="grid gap-6">
          {sessions.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 shadow">
              <p className="text-gray-600">No sessions available yet.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <section key={session.id} className="rounded-3xl bg-white p-6 shadow">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{session.title}</h3>
                    <p className="text-sm text-slate-500 mt-2">Room: {session.room_name}</p>
                    <p className="text-sm text-slate-500 mt-1">Status: {session.status}</p>
                    <p className="mt-4 text-slate-600">{session.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-3xl bg-green-600 px-4 py-3 text-white hover:bg-green-700"
                      onClick={() => navigate(`/classroom?room=${session.room_name}`)}
                    >
                      <Play size={18} /> Start
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-3xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
                      onClick={() => setAssignmentActiveRoom(session.id === assignmentActiveRoom ? null : session.id)}
                    >
                      <UploadCloud size={18} /> Upload Assignment
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-3xl bg-purple-600 px-4 py-3 text-white hover:bg-purple-700"
                      onClick={() => setRecordingActiveRoom(session.id === recordingActiveRoom ? null : session.id)}
                    >
                      <Play size={18} /> Upload Replay
                    </button>
                  </div>
                </div>

                {assignmentActiveRoom === session.id && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h4 className="text-lg font-semibold text-slate-900">Upload assignment for this session</h4>
                    <div className="grid gap-4 mt-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Assignment title</label>
                        <input
                          type="text"
                          value={assignmentForms[session.id]?.title || ''}
                          onChange={(event) =>
                            setAssignmentForms((prev) => ({
                              ...prev,
                              [session.id]: {
                                ...(prev[session.id] || { description: '', file_url: '', due_date: '' }),
                                title: event.target.value,
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Due date</label>
                        <input
                          type="date"
                          value={assignmentForms[session.id]?.due_date || ''}
                          onChange={(event) =>
                            setAssignmentForms((prev) => ({
                              ...prev,
                              [session.id]: {
                                ...(prev[session.id] || { title: '', description: '', file_url: '' }),
                                due_date: event.target.value,
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea
                          value={assignmentForms[session.id]?.description || ''}
                          onChange={(event) =>
                            setAssignmentForms((prev) => ({
                              ...prev,
                              [session.id]: {
                                ...(prev[session.id] || { title: '', file_url: '', due_date: '' }),
                                description: event.target.value,
                              },
                            }))
                          }
                          rows={3}
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">File or resource link</label>
                        <input
                          type="url"
                          value={assignmentForms[session.id]?.file_url || ''}
                          onChange={(event) =>
                            setAssignmentForms((prev) => ({
                              ...prev,
                              [session.id]: {
                                ...(prev[session.id] || { title: '', description: '', due_date: '' }),
                                file_url: event.target.value,
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                          placeholder="https://example.com/materials.pdf"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateAssignment(session.id)}
                      className="mt-4 inline-flex items-center gap-2 rounded-3xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-500"
                    >
                      <FileUp size={18} /> Upload Assignment
                    </button>
                  </div>
                )}

                {recordingActiveRoom === session.id && (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h4 className="text-lg font-semibold text-slate-900">Upload replay for this session</h4>
                    <div className="grid gap-4 mt-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700">Replay URL</label>
                        <input
                          type="url"
                          value={recordingForms[session.id]?.recording_url || ''}
                          onChange={(event) =>
                            setRecordingForms((prev) => ({
                              ...prev,
                              [session.id]: {
                                ...(prev[session.id] || { duration: '' }),
                                recording_url: event.target.value,
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-purple-500"
                          placeholder="https://example.com/replay.mp4"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Duration (seconds)</label>
                        <input
                          type="number"
                          min="0"
                          value={recordingForms[session.id]?.duration || ''}
                          onChange={(event) =>
                            setRecordingForms((prev) => ({
                              ...prev,
                              [session.id]: {
                                ...(prev[session.id] || { recording_url: '' }),
                                duration: event.target.value,
                              },
                            }))
                          }
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-purple-500"
                          placeholder="120"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateRecording(session.id)}
                      className="mt-4 inline-flex items-center gap-2 rounded-3xl bg-purple-600 px-5 py-3 text-white hover:bg-purple-500"
                    >
                      <Play size={18} /> Save Replay
                    </button>
                  </div>
                )}

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <h4 className="text-lg font-semibold text-slate-900">Session replays</h4>
                  {recordingsByRoom[session.id]?.length ? (
                    <div className="mt-4 space-y-3">
                      {recordingsByRoom[session.id].map((recording) => (
                        <a
                          key={recording.id}
                          href={recording.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-3xl border border-purple-200 bg-white px-4 py-3 hover:bg-purple-50"
                        >
                          <span className="font-medium text-purple-900">Replay recorded on {new Date(recording.created_at).toLocaleDateString()}</span>
                          <span className="text-sm text-purple-600">{recording.duration_seconds ? `${recording.duration_seconds}s` : 'View'}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">No replays have been uploaded for this session yet.</p>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <h4 className="text-lg font-semibold text-slate-900">Student questions</h4>
                  {(questions.filter((question) => question.room_id === session.id) || []).length === 0 ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-600">No questions submitted yet.</div>
                  ) : (
                    questions
                      .filter((question) => question.room_id === session.id)
                      .map((question) => (
                        <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                          <p className="font-semibold text-slate-900">{question.student_name}</p>
                          <p className="mt-2 text-slate-600">{question.question}</p>
                          {question.is_answered ? (
                            <div className="mt-4 rounded-3xl bg-emerald-50 p-4 text-slate-800">
                              <p className="font-semibold">Answered</p>
                              <p>{question.answer}</p>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <textarea
                                value={answerDrafts[question.id] || ''}
                                onChange={(event) =>
                                  setAnswerDrafts((prev) => ({ ...prev, [question.id]: event.target.value }))
                                }
                                rows={3}
                                className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
                                placeholder="Write your answer here"
                              />
                              <button
                                type="button"
                                onClick={() => handleAnswerQuestion(question.id, answerDrafts[question.id] || "")}
                                className="mt-3 inline-flex items-center gap-2 rounded-3xl bg-green-600 px-5 py-3 text-white hover:bg-green-500"
                              >
                                <MessageSquare size={18} /> Answer Question
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
