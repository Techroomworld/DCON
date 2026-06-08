import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { clearLocalAuth, getLocalAuth } from "../lib/localAuth";
import { LogOut, Zap, MessageSquare, FileDown, Paperclip, Send } from "lucide-react";

type SessionRecord = {
  id: string;
  title: string;
  description: string;
  room_name: string;
};

type AssignmentRecord = {
  id: string;
  title: string;
  file_url: string | null;
  room_id: string;
  due_date: string | null;
};

export default function StudentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [assignmentsByRoom, setAssignmentsByRoom] = useState<Record<string, AssignmentRecord[]>>({});
  const [recordingsByRoom, setRecordingsByRoom] = useState<Record<string, Array<{ id: string; recording_url: string; duration_seconds: number | null; recorded_at: string }>>>({});
  const [email, setEmail] = useState("");
  const [questionRoom, setQuestionRoom] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [submissionRoom, setSubmissionRoom] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<Record<string, string>>({});
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const init = async () => {
      const localUser = getLocalAuth();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!localUser || localUser.role !== "student") {
          navigate("/login");
          return;
        }

        setEmail(localUser.email || "");
        setIsApproved(true);
        setLoading(false);
        return;
      }

      setEmail(session.user.email || "");

      const { data: userData } = await supabase
        .from("users")
        .select("approved, role")
        .eq("id", session.user.id)
        .single();

      if (userData?.role === "admin") {
        navigate("/admin");
        return;
      }
      if (userData?.role === "teacher") {
        navigate("/teacher");
        return;
      }
      if (userData?.role !== "student") {
        navigate("/login");
        return;
      }

      setIsApproved(!!userData?.approved);

      const { data } = await supabase
        .from("classroom_sessions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      const activeSessions = data || [];
      setSessions(activeSessions);

      if (activeSessions.length > 0) {
        const roomIds = activeSessions.map((item) => item.id);
        const { data: assignmentData } = await supabase
          .from("assignments")
          .select("*")
          .in("room_id", roomIds);

        const assignmentMap: Record<string, AssignmentRecord[]> = {};
        (assignmentData || []).forEach((assignment) => {
          const roomId = assignment.room_id;
          assignmentMap[roomId] = [...(assignmentMap[roomId] || []), assignment];
        });

        const { data: recordingData } = await supabase
          .from('session_recordings')
          .select('*')
          .in('room_id', roomIds)
          .order('recorded_at', { ascending: false });

        const recordingMap: Record<string, Array<{ id: string; recording_url: string; duration_seconds: number | null; recorded_at: string }>> = {};
        (recordingData || []).forEach((recording: any) => {
          recordingMap[recording.room_id] = [...(recordingMap[recording.room_id] || []), recording];
        });

        setAssignmentsByRoom(assignmentMap);
        setRecordingsByRoom(recordingMap);
      }

      setLoading(false);
    };

    init();
  }, [navigate]);

  const handleLogout = async () => {
    clearLocalAuth();
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleAskQuestion = async (sessionId: string) => {
    if (!questionText.trim()) {
      setError("Please enter a question before submitting.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { error: insertError } = await supabase.from("questions").insert({
      room_id: sessionId,
      student_id: session.user.id,
      student_name: session.user.email || "Student",
      question: questionText.trim(),
      is_answered: false,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("Question submitted to the teacher.");
    setQuestionText("");
    setQuestionRoom(null);
  };

  const handleSubmitAssignment = async (roomId: string) => {
    const assignmentId = selectedAssignmentId[roomId];
    if (!assignmentId) {
      setError("Please choose an assignment to submit.");
      return;
    }
    if (!submissionUrl.trim()) {
      setError("Please provide a valid submission link.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { error: insertError } = await supabase.from("submissions").insert({
      assignment_id: assignmentId,
      student_id: session.user.id,
      student_name: session.user.email || "Student",
      file_url: submissionUrl.trim(),
      submitted_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("Assignment submitted successfully.");
    setSubmissionUrl("");
    setSubmissionRoom(null);
  };

  const handleJoinSession = (roomName: string) => {
    navigate(`/classroom?room=${roomName}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
            <p className="text-gray-600">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Available Classes</h2>
            <p className="text-gray-600">Join an active class, ask questions, and submit assignments.</p>
            {!isApproved && (
              <p className="mt-2 rounded-3xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-yellow-800">
                Your student account is pending teacher approval. Class access will be enabled once approved.
              </p>
            )}
          </div>
          {message && <div className="rounded-3xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">{message}</div>}
          {error && <div className="rounded-3xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">{error}</div>}
        </div>

        <div className="grid gap-6">
          {sessions.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-600">No active classes available right now.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{session.title}</h3>
                    <p className="text-gray-600 mt-2">{session.description}</p>
                    <p className="text-sm text-gray-500 mt-2">Room: {session.room_name}</p>
                  </div>
                  <button
                    onClick={() => handleJoinSession(session.room_name)}
                    disabled={!isApproved}
                    className={`inline-flex items-center gap-2 self-start rounded-lg px-6 py-3 text-white transition ${isApproved ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    <Zap size={20} /> Join Class
                  </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <button
                    onClick={() => setQuestionRoom(session.id === questionRoom ? null : session.id)}
                    className="flex items-center gap-2 rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 hover:bg-blue-100"
                  >
                    <MessageSquare size={18} /> Ask Question
                  </button>
                  <button
                    onClick={() => setSubmissionRoom(session.id === submissionRoom ? null : session.id)}
                    className="flex items-center gap-2 rounded-3xl border border-purple-200 bg-purple-50 px-4 py-3 text-purple-700 hover:bg-purple-100"
                  >
                    <Paperclip size={18} /> Submit Assignment
                  </button>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Materials</p>
                    <div className="mt-3 space-y-2">
                      {assignmentsByRoom[session.id]?.length ? (
                        assignmentsByRoom[session.id].map((assignment) => (
                          <a
                            key={assignment.id}
                            href={assignment.file_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-700 hover:bg-slate-100"
                          >
                            {assignment.title}
                          </a>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No materials have been uploaded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Class Replays</h3>
                  {recordingsByRoom[session.id]?.length ? (
                    <div className="mt-4 space-y-3">
                      {recordingsByRoom[session.id].map((recording) => (
                        <a
                          key={recording.id}
                          href={recording.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 hover:bg-slate-100"
                        >
                          <span className="font-medium text-slate-900">Replay from {new Date(recording.recorded_at).toLocaleDateString()}</span>
                          <span className="text-sm text-slate-500">{recording.duration_seconds ? `${recording.duration_seconds}s` : 'Watch'}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">No session replays available yet.</p>
                  )}
                </div>

                {questionRoom === session.id && (
                  <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6">
                    <h4 className="font-semibold text-blue-900">Ask a question for this class</h4>
                    <textarea
                      value={questionText}
                      onChange={(event) => setQuestionText(event.target.value)}
                      rows={4}
                      className="mt-3 w-full rounded-3xl border border-blue-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400"
                      placeholder="What do you want to ask your teacher?"
                    />
                    <button
                      type="button"
                      onClick={() => handleAskQuestion(session.id)}
                      className="mt-4 inline-flex items-center gap-2 rounded-3xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-500"
                    >
                      <Send size={18} /> Send Question
                    </button>
                  </div>
                )}

                {submissionRoom === session.id && (
                  <div className="mt-6 rounded-3xl border border-purple-200 bg-purple-50 p-6">
                    <h4 className="font-semibold text-purple-900">Submit an assignment</h4>
                    <div className="mt-3 space-y-4">
                      <label className="block text-sm font-medium text-slate-700">Choose assignment</label>
                      <select
                        value={selectedAssignmentId[session.id] || ''}
                        onChange={(event) =>
                          setSelectedAssignmentId((prev) => ({
                            ...prev,
                            [session.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-3xl border border-purple-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-purple-400"
                      >
                        <option value="">Select an assignment</option>
                        {assignmentsByRoom[session.id]?.map((assignment) => (
                          <option key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </option>
                        ))}
                      </select>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Submission link</label>
                        <input
                          type="url"
                          value={submissionUrl}
                          onChange={(event) => setSubmissionUrl(event.target.value)}
                          placeholder="https://example.com/submission"
                          className="mt-2 w-full rounded-3xl border border-purple-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-purple-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSubmitAssignment(session.id)}
                        className="inline-flex items-center gap-2 rounded-3xl bg-purple-600 px-5 py-3 text-white hover:bg-purple-500"
                      >
                        Submit Assignment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
