import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LogOut, Users, BookOpen, BarChart3, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface Stats {
  totalUsers: number;
  activeRooms: number;
  totalMessages: number;
  totalAssignments: number;
}

interface Teacher {
  id: string;
  email: string;
  full_name: string;
  can_login: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students'>('overview');
  const [token, setToken] = useState('');
  
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeRooms: 0,
    totalMessages: 0,
    totalAssignments: 0,
  });

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ email: '', password: '', full_name: '' });
  const [addTeacherError, setAddTeacherError] = useState('');
  const [addTeacherSuccess, setAddTeacherSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

      setToken(session.access_token);

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

      // Fetch teachers
      await fetchTeachers(session.access_token);

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchTeachers = async (accessToken: string) => {
    try {
      const response = await fetch('http://localhost:3001/admin/teachers', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (data.teachers) {
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTeacherError('');
    setAddTeacherSuccess('');

    if (!newTeacher.email || !newTeacher.password) {
      setAddTeacherError('Email and password are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newTeacher.email,
          password: newTeacher.password,
          full_name: newTeacher.full_name || newTeacher.email.split('@')[0],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAddTeacherError(data.error || 'Failed to create teacher');
        return;
      }

      setAddTeacherSuccess('Teacher created successfully!');
      setNewTeacher({ email: '', password: '', full_name: '' });
      setShowAddTeacher(false);
      await fetchTeachers(token);
    } catch (error) {
      setAddTeacherError('Failed to create teacher');
      console.error(error);
    }
  };

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
        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-semibold ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`py-4 px-2 border-b-2 font-semibold ${
                activeTab === 'teachers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Teachers
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-2 border-b-2 font-semibold ${
                activeTab === 'students'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Students
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
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
          </>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Teacher Management</h2>
              <button
                onClick={() => setShowAddTeacher(!showAddTeacher)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <Plus size={20} /> Add Teacher
              </button>
            </div>

            {showAddTeacher && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Teacher</h3>
                <form onSubmit={handleAddTeacher} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newTeacher.email}
                      onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="teacher@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (Optional)</label>
                    <input
                      type="text"
                      value={newTeacher.full_name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newTeacher.password}
                        onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  {addTeacherError && <p className="text-red-600 text-sm">{addTeacherError}</p>}
                  {addTeacherSuccess && <p className="text-green-600 text-sm">{addTeacherSuccess}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                      Create Teacher
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTeacher(false)}
                      className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Joined</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No teachers created yet
                      </td>
                    </tr>
                  ) : (
                    teachers.map((teacher) => (
                      <tr key={teacher.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{teacher.full_name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{teacher.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            teacher.can_login
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {teacher.can_login ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(teacher.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button className="text-blue-600 hover:text-blue-800 font-semibold mr-4">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-800 font-semibold">
                            <Trash2 size={16} className="inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600">Student management features coming soon. You can approve pending students in the teacher dashboard.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

