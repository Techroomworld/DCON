import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LogOut, Users, BookOpen, BarChart3 } from "lucide-react";

interface Stats {
  totalUsers: number;
  activeRooms: number;
  totalMessages: number;
  totalAssignments: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeRooms: 0,
    totalMessages: 0,
    totalAssignments: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
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

      if (userData?.role !== "admin") {
        navigate("/login");
        return;
      }

      // Fetch stats
      const [usersRes, roomsRes, messagesRes, assignmentsRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact" }),
        supabase.from("classroom_sessions").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("chat_messages").select("id", { count: "exact" }),
        supabase.from("assignments").select("id", { count: "exact" }),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        activeRooms: roomsRes.count || 0,
        totalMessages: messagesRes.count || 0,
        totalAssignments: assignmentsRes.count || 0,
      });

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <Users className="text-blue-500" size={32} />
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <BookOpen className="text-green-500" size={32} />
              <div>
                <p className="text-gray-600 text-sm">Active Rooms</p>
                <p className="text-3xl font-bold text-gray-800">{stats.activeRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <BarChart3 className="text-purple-500" size={32} />
              <div>
                <p className="text-gray-600 text-sm">Total Messages</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalMessages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <BookOpen className="text-orange-500" size={32} />
              <div>
                <p className="text-gray-600 text-sm">Assignments</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalAssignments}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">User Management</h2>
            <p className="text-gray-600 mb-4">Manage user roles, permissions, and access.</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold">
              Manage Users
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Room Management</h2>
            <p className="text-gray-600 mb-4">Create, monitor, and manage active classrooms.</p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold">
              Manage Rooms
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Reports</h2>
            <p className="text-gray-600 mb-4">View attendance, engagement, and assignment stats.</p>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold">
              View Reports
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Content Library</h2>
            <p className="text-gray-600 mb-4">Browse and manage all uploaded articles and assignments.</p>
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-semibold">
              View Library
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
