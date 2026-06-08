import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { clearLocalAuth, getLocalAuth } from "../lib/localAuth";
import { LogOut, Users, BookOpen, BarChart3, Plus, Trash2, Eye, EyeOff, CalendarDays, MessageCircle, FileText, UserPlus, ClipboardList } from "lucide-react";

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
  const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://dcon-1.onrender.com';
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students'>('overview');
  const [selectedAdminAction, setSelectedAdminAction] = useState<'bookings' | 'addUsers' | 'teacherCalendar' | 'materials' | 'supportChat' | 'studentView' | 'teacherView'>('bookings');
  const [token, setToken] = useState('');
  const [newUserRole, setNewUserRole] = useState<'teacher' | 'admin' | 'student'>('teacher');
  
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeRooms: 0,
    totalMessages: 0,
    totalAssignments: 0,
  });

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Teacher[]>([]);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [bookings, setBookings] = useState<Array<{ id: string; teacher_name: string; student_name: string; subject: string; topic: string; scheduled_at: string; status: string }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string; event_type: string; room_id: string; description: string | null }>>([]);
  const [articles, setArticles] = useState<Array<{ id: string; title: string; content: string | null; file_url: string | null; created_at: string }>>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender_id: string; recipient_id: string; message: string; created_at: string }>>([]);
  const [chatRecipientId, setChatRecipientId] = useState('');
  const [recipientType, setRecipientType] = useState<'student' | 'teacher'>('student');
  const [chatDraft, setChatDraft] = useState('');
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '' });
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState('');
  const [newMaterial, setNewMaterial] = useState({ title: '', content: '', file_url: '', room_id: '' });
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', event_type: 'class', room_id: '', recurrence: '' });
  const [actionMessage, setActionMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const localUser = getLocalAuth();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!localUser || localUser.role !== "admin") {
          navigate("/login");
          return;
        }

        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (userData?.role === "teacher") {
        navigate("/teacher");
        return;
      }
      if (userData?.role === "student") {
        navigate("/student");
        return;
      }
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

      // Fetch admin resources
      await Promise.all([
        fetchTeachers(session.access_token),
        fetchStudents(),
        fetchBookings(),
        fetchEvents(),
        fetchArticles(),
      ]);

      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchTeachers = async (accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/teachers`, {
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

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, can_login, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (!error) {
        setStudents(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_bookings')
        .select('id, subject, topic, scheduled_at, status, teacher:users!teacher_id(full_name), student:users!student_id(full_name)')
        .order('scheduled_at', { ascending: true });

      if (!error) {
        setBookings(
          (data || []).map((booking: any) => ({
            id: booking.id,
            teacher_name: booking.teacher?.full_name || 'Teacher',
            student_name: booking.student?.full_name || 'Student',
            subject: booking.subject,
            topic: booking.topic || '',
            scheduled_at: booking.scheduled_at,
            status: booking.status,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await fetch(`${API_URL}/articles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    }
  };

  const fetchMessages = async (recipientId: string) => {
    if (!recipientId) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/direct-messages?peer_id=${recipientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setChatMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch direct messages:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserSuccess('');
    setActionMessage('');

    if (!newUser.email || !newUser.password) {
      setAddUserError('Email and password are required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name || newUser.email.split('@')[0],
          role: newUserRole,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setAddUserError(data.error || 'Failed to create user');
        return;
      }

      setAddUserSuccess(`${newUserRole.charAt(0).toUpperCase() + newUserRole.slice(1)} created successfully!`);
      setNewUser({ email: '', password: '', full_name: '' });
      setShowAddTeacher(false);
      await Promise.all([fetchTeachers(token), fetchStudents()]);
    } catch (error) {
      setAddUserError('Failed to create user');
      console.error(error);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage('');

    if (!newMaterial.title) {
      setActionMessage('Material title is required.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newMaterial),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionMessage(data.error || 'Failed to create material');
        return;
      }

      setActionMessage('Material uploaded successfully.');
      setNewMaterial({ title: '', content: '', file_url: '', room_id: '' });
      await fetchArticles();
    } catch (error) {
      setActionMessage('Failed to create material');
      console.error(error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage('');

    if (!newEvent.title || !newEvent.event_date) {
      setActionMessage('Event title and date are required.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEvent),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionMessage(data.error || 'Failed to create event');
        return;
      }

      setActionMessage('Teacher calendar event created successfully.');
      setNewEvent({ title: '', description: '', event_date: '', event_type: 'class', room_id: '', recurrence: '' });
      await fetchEvents();
    } catch (error) {
      setActionMessage('Failed to create event');
      console.error(error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage('');

    if (!chatRecipientId || !chatDraft.trim()) {
      setActionMessage('Please select a recipient and type a message.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/direct-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipient_id: chatRecipientId, message: chatDraft.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionMessage(data.error || 'Failed to send message');
        return;
      }

      setChatDraft('');
      await fetchMessages(chatRecipientId);
      setActionMessage('Message sent.');
    } catch (error) {
      setActionMessage('Failed to send message');
      console.error(error);
    }
  };

  const handleRecipientTypeChange = (type: 'student' | 'teacher') => {
    setRecipientType(type);
    setChatRecipientId('');
    setChatMessages([]);
  };

  const handleTopicActionSelect = async (action: typeof selectedAdminAction) => {
    setSelectedAdminAction(action);
    setActionMessage('');
    if (action === 'bookings') {
      await fetchBookings();
    } else if (action === 'teacherCalendar') {
      await fetchEvents();
    } else if (action === 'materials') {
      await fetchArticles();
    } else if (action === 'studentView') {
      await fetchStudents();
    } else if (action === 'teacherView') {
      await fetchTeachers(token);
    }
  };

  const handleLogout = async () => {
    clearLocalAuth();
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

            <section className="rounded-3xl bg-white p-6 shadow mb-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Admin Action Center</h2>
                  <p className="text-gray-600">Quickly switch between bookings, calendar, materials, users, and support chat.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: 'bookings', label: 'Bookings', icon: CalendarDays },
                    { id: 'teacherCalendar', label: 'Calendar', icon: CalendarDays },
                    { id: 'materials', label: 'Materials', icon: FileText },
                    { id: 'supportChat', label: 'Support Chat', icon: MessageCircle },
                    { id: 'studentView', label: 'Student View', icon: Users },
                    { id: 'teacherView', label: 'Teacher View', icon: UserPlus },
                    { id: 'addUsers', label: 'Add User', icon: Plus },
                  ].map((action) => {
                    const Icon = action.icon as any;
                    const isActive = selectedAdminAction === action.id;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleTopicActionSelect(action.id as typeof selectedAdminAction)}
                        className={`flex items-center justify-center gap-2 rounded-3xl border px-4 py-3 text-sm font-semibold transition ${isActive ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'}`}
                      >
                        <Icon className="w-4 h-4" />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {actionMessage && (
                <div className="mt-6 rounded-3xl bg-slate-50 border border-slate-200 p-4 text-slate-700">
                  {actionMessage}
                </div>
              )}

              <div className="mt-6 space-y-6">
                {selectedAdminAction === 'bookings' && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Teacher Booking Requests</h3>
                    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100 text-left text-sm text-slate-600">
                          <tr>
                            <th className="px-6 py-4">Teacher</th>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Subject</th>
                            <th className="px-6 py-4">Topic</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {bookings.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-6 text-center text-slate-500">No bookings available.</td>
                            </tr>
                          ) : (
                            bookings.map((booking) => (
                              <tr key={booking.id} className="bg-white">
                                <td className="px-6 py-4 text-sm text-slate-900">{booking.teacher_name}</td>
                                <td className="px-6 py-4 text-sm text-slate-900">{booking.student_name}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">{booking.subject}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">{booking.topic}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">{new Date(booking.scheduled_at).toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-slate-900">{booking.status}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedAdminAction === 'teacherCalendar' && (
                  <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-3xl bg-slate-50 p-6">
                      <h3 className="text-xl font-semibold mb-4">Schedule Teacher Event</h3>
                      <form onSubmit={handleCreateEvent} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Title</label>
                          <input
                            value={newEvent.title}
                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Teacher planning session"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Description</label>
                          <textarea
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                            rows={3}
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Add notes for the session"
                          />
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Date</label>
                            <input
                              type="datetime-local"
                              value={newEvent.event_date}
                              onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                              className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Event Type</label>
                            <select
                              value={newEvent.event_type}
                              onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                              className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            >
                              <option value="class">Class</option>
                              <option value="meeting">Meeting</option>
                              <option value="deadline">Deadline</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        <button type="submit" className="inline-flex items-center gap-2 rounded-3xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
                          <CalendarDays size={18} /> Create Event
                        </button>
                      </form>
                    </div>
                    <div className="rounded-3xl bg-white p-6 shadow">
                      <h3 className="text-xl font-semibold mb-4">Upcoming Events</h3>
                      <div className="space-y-4">
                        {events.length === 0 ? (
                          <p className="text-slate-600">No events scheduled yet.</p>
                        ) : (
                          events.map((event) => (
                            <div key={event.id} className="rounded-3xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-slate-900">{event.title}</p>
                                  <p className="text-sm text-slate-500">{new Date(event.event_date).toLocaleString()}</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{event.event_type}</span>
                              </div>
                              <p className="mt-3 text-slate-600">{event.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedAdminAction === 'materials' && (
                  <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-3xl bg-slate-50 p-6">
                      <h3 className="text-xl font-semibold mb-4">Upload New Material</h3>
                      <form onSubmit={handleCreateMaterial} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Title</label>
                          <input
                            value={newMaterial.title}
                            onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Material title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Content</label>
                          <textarea
                            value={newMaterial.content}
                            onChange={(e) => setNewMaterial({ ...newMaterial, content: e.target.value })}
                            rows={4}
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Add material notes or article copy"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">File URL</label>
                          <input
                            value={newMaterial.file_url}
                            onChange={(e) => setNewMaterial({ ...newMaterial, file_url: e.target.value })}
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="https://example.com/material.pdf"
                          />
                        </div>
                        <button type="submit" className="inline-flex items-center gap-2 rounded-3xl bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700">
                          <ClipboardList size={18} /> Upload Material
                        </button>
                      </form>
                    </div>
                    <div className="rounded-3xl bg-white p-6 shadow">
                      <h3 className="text-xl font-semibold mb-4">Materials</h3>
                      <div className="space-y-4">
                        {articles.length === 0 ? (
                          <p className="text-slate-600">No materials have been added yet.</p>
                        ) : (
                          articles.map((article) => (
                            <div key={article.id} className="rounded-3xl border border-slate-200 p-4">
                              <p className="font-semibold text-slate-900">{article.title}</p>
                              <p className="text-sm text-slate-500">{article.content?.slice(0, 120) || 'No description provided.'}</p>
                              {article.file_url && (
                                <a href={article.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline mt-2 block text-sm">Open file</a>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedAdminAction === 'supportChat' && (
                  <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-3xl bg-slate-50 p-6">
                      <h3 className="text-xl font-semibold mb-4">Admin Support Chat</h3>
                      <div className="grid gap-4 sm:grid-cols-2 mb-4">
                        <button
                          type="button"
                          onClick={() => handleRecipientTypeChange('student')}
                          className={`rounded-3xl px-4 py-3 text-sm font-semibold ${recipientType === 'student' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                        >
                          Student
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRecipientTypeChange('teacher')}
                          className={`rounded-3xl px-4 py-3 text-sm font-semibold ${recipientType === 'teacher' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                        >
                          Teacher
                        </button>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700">Recipient</label>
                        <select
                          value={chatRecipientId}
                          onChange={(e) => {
                            setChatRecipientId(e.target.value);
                            fetchMessages(e.target.value);
                          }}
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">Choose a recipient</option>
                          {(recipientType === 'student' ? students : teachers).map((person) => (
                            <option key={person.id} value={person.id}>{person.full_name || person.email}</option>
                          ))}
                        </select>
                      </div>
                      <form onSubmit={handleSendMessage} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Message</label>
                          <textarea
                            value={chatDraft}
                            onChange={(e) => setChatDraft(e.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Type your support message here"
                          />
                        </div>
                        <button type="submit" className="inline-flex items-center gap-2 rounded-3xl bg-slate-900 px-5 py-3 text-white hover:bg-slate-800">
                          <MessageCircle size={18} /> Send Message
                        </button>
                      </form>
                    </div>
                    <div className="rounded-3xl bg-white p-6 shadow overflow-y-auto max-h-152">
                      <h3 className="text-xl font-semibold mb-4">Conversation</h3>
                      {chatMessages.length === 0 ? (
                        <p className="text-slate-600">Select a recipient to view messages.</p>
                      ) : (
                        chatMessages.map((message) => (
                          <div key={message.id} className="mb-4 rounded-3xl border border-slate-200 p-4 bg-slate-50">
                            <p className="text-sm text-slate-500">{message.created_at ? new Date(message.created_at).toLocaleString() : 'Just now'}</p>
                            <p className="mt-2 text-slate-800">{message.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {selectedAdminAction === 'studentView' && (
                  <div className="rounded-3xl bg-white p-6 shadow">
                    <h3 className="text-xl font-semibold mb-4">Student View</h3>
                    <p className="text-slate-600 mb-4">Inspect student profiles and confirm enrollment errors in one place.</p>
                    <div className="grid gap-4">
                      {students.length === 0 ? (
                        <p className="text-slate-600">No students found.</p>
                      ) : (
                        students.map((student) => (
                          <div key={student.id} className="rounded-3xl border border-slate-200 p-4">
                            <p className="font-semibold text-slate-900">{student.full_name || student.email}</p>
                            <p className="text-sm text-slate-600">{student.email}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {selectedAdminAction === 'teacherView' && (
                  <div className="rounded-3xl bg-white p-6 shadow">
                    <h3 className="text-xl font-semibold mb-4">Teacher View</h3>
                    <p className="text-slate-600 mb-4">Inspect teacher profiles, schedule, and delivery details.</p>
                    <div className="grid gap-4">
                      {teachers.length === 0 ? (
                        <p className="text-slate-600">No teachers found.</p>
                      ) : (
                        teachers.map((teacher) => (
                          <div key={teacher.id} className="rounded-3xl border border-slate-200 p-4">
                            <p className="font-semibold text-slate-900">{teacher.full_name || teacher.email}</p>
                            <p className="text-sm text-slate-600">{teacher.email}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {selectedAdminAction === 'addUsers' && (
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <h3 className="text-xl font-semibold mb-4">Add a new user</h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Role</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as 'teacher' | 'admin' | 'student')}
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="student">Student</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Email</label>
                        <input
                          value={newUser.email}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="newuser@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Full Name</label>
                        <input
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="Alex Johnson"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="Choose a password"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="submit" className="inline-flex items-center gap-2 rounded-3xl bg-green-600 px-5 py-3 text-white hover:bg-green-700">
                          <UserPlus size={18} /> Create {newUserRole === 'admin' ? 'Admin' : newUserRole === 'teacher' ? 'Teacher' : 'Student'}
                        </button>
                        <button type="button" onClick={() => setShowAddTeacher(false)} className="rounded-3xl border border-slate-300 px-5 py-3 text-slate-700 bg-white hover:bg-slate-100">
                          Cancel
                        </button>
                      </div>
                      {addUserError && <p className="text-red-600 text-sm">{addUserError}</p>}
                      {addUserSuccess && <p className="text-green-600 text-sm">{addUserSuccess}</p>}
                    </form>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
              <button
                onClick={() => setShowAddTeacher(!showAddTeacher)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <Plus size={20} /> Add User
              </button>
            </div>

            {showAddTeacher && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'teacher' | 'admin' | 'student')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                      <option value="student">Student</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (Optional)</label>
                    <input
                      type="text"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
                  {addUserError && <p className="text-red-600 text-sm">{addUserError}</p>}
                  {addUserSuccess && <p className="text-green-600 text-sm">{addUserSuccess}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
                    >
                      Create {newUserRole === 'admin' ? 'Admin' : newUserRole === 'teacher' ? 'Teacher' : 'Student'}
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

