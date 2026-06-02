import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LogOut, Zap, MessageSquare, FileDown } from "lucide-react";

export default function StudentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      setEmail(session.user.email || "");

      // Fetch active sessions
      const { data } = await supabase
        .from("classroom_sessions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setSessions(data || []);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleJoinSession = (roomName: string) => {
    navigate(`/classroom?room=${roomName}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Classes</h2>

        <div className="grid gap-6">
          {sessions.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-600">No active classes available right now.</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{session.title}</h3>
                    <p className="text-gray-600">{session.description}</p>
                    <p className="text-sm text-gray-500 mt-2">Room: {session.room_name}</p>
                  </div>
                  <button
                    onClick={() => handleJoinSession(session.room_name)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    <Zap size={20} /> Join Class
                  </button>
                </div>
                <div className="flex gap-4 mt-4 border-t pt-4">
                  <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                    <MessageSquare size={18} /> Ask Question
                  </button>
                  <button className="flex items-center gap-2 text-purple-600 hover:text-purple-700">
                    <FileDown size={18} /> Download Materials
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
