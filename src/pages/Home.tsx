import { useEffect, useState } from "react";
import {
  GraduationCap,
  PlayCircle,
  Video,
  Users,
  BarChart3,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Home() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Array<{ id: string; email: string; full_name?: string }>>([]);
  const [courseSessions, setCourseSessions] = useState<Array<{ id: string; title: string; description?: string; teacher_id: string; room_name: string; started_at?: string; status: string }>>([]);
  const [bookingTeacher, setBookingTeacher] = useState("");
  const [bookingSubject, setBookingSubject] = useState("Digital Marketing");
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const SUBJECTS = [
    "Digital Marketing",
    "Web Development",
    "Data Science",
    "Design & Branding",
    "Business Strategy",
  ];

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();
  }, []);

  // Smooth scroll
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement;

      if (target?.tagName === "A" && target.getAttribute("href")?.startsWith("#")) {
        e.preventDefault();

        const id = target.getAttribute("href")?.replace("#", "");
        const el = document.getElementById(id || "");

        el?.scrollIntoView({ behavior: "smooth" });
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    const loadTeachers = async () => {
      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("role", "teacher");

      if (!teacherError && teacherData) {
        setTeachers(teacherData);
        if (!bookingTeacher && teacherData.length > 0) {
          setBookingTeacher(teacherData[0].id);
        }
      }

      const { data: sessionData, error: sessionsError } = await supabase
        .from("classroom_sessions")
        .select("id, title, description, room_name, teacher_id, started_at, status")
        .in("status", ["active", "scheduled"])
        .order("started_at", { ascending: true });

      if (!sessionsError && sessionData) {
        setCourseSessions(sessionData);
      }
    };

    loadTeachers();
  }, [bookingTeacher]);

  const handleBookTeacher = async () => {
    setBookingMessage(null);
    setBookingError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      navigate("/login");
      return;
    }

    if (!bookingTeacher) {
      setBookingError("Please select a teacher to book.");
      return;
    }

    try {
      const { error: bookingError } = await supabase.from("teacher_bookings").insert({
        teacher_id: bookingTeacher,
        student_id: session.user.id,
        subject: bookingSubject,
        topic: bookingTopic || `Introduction to ${bookingSubject}`,
        scheduled_at: bookingDate ? new Date(bookingDate).toISOString() : new Date().toISOString(),
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (bookingError) {
        setBookingError(bookingError.message);
        return;
      }

      setBookingMessage("Your booking request was sent to the teacher.");
      setBookingTopic("");
      setBookingDate("");
    } catch (err) {
      setBookingError("Unable to book the teacher right now.");
    }
  };

  return (
    <div className="bg-slate-900 text-white antialiased">

      {/* NAV */}
      <nav className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl">DCONS</span>
          </div>

          <div className="hidden md:flex gap-8 text-slate-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#courses" className="hover:text-white">Courses</a>
            <a href="#about" className="hover:text-white">About</a>
            <a href="#contact" className="hover:text-white">Contact</a>
            <a href="/student" className="hover:text-white">Classroom</a>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-xl font-semibold"
          >
            Login
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500">
        <div className="text-center max-w-4xl px-6">
          <h1 className="text-6xl md:text-8xl font-black mb-6">
            Welcome to <span className="text-yellow-300">DCONS</span>
          </h1>

          <p className="text-xl text-slate-100 mb-10">
            The future of online education — connect, learn, and grow.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => navigate("/login")}
              className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition"
            >
              <PlayCircle className="w-5 h-5" />
              Login to Portal
            </button>

            <button
              onClick={() => navigate("/student")}
              className="bg-slate-900/80 border border-white/20 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-800 transition"
            >
              Open Student Portal
            </button>

            <a
              href="#features"
              className="border border-white px-10 py-4 rounded-2xl font-bold hover:bg-white/10"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-8">
        <h2 className="text-4xl font-black text-center mb-16">
          Why Choose DCONS?
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          <div className="bg-slate-800 p-8 rounded-3xl">
            <Video className="w-10 h-10 mb-4 text-indigo-400" />
            <h3 className="text-xl font-bold mb-2">Live Classes</h3>
            <p className="text-slate-300">
              Real-time interactive learning with teachers.
            </p>
          </div>

          <div className="bg-slate-800 p-8 rounded-3xl">
            <Users className="w-10 h-10 mb-4 text-emerald-400" />
            <h3 className="text-xl font-bold mb-2">Collaboration</h3>
            <p className="text-slate-300">
              Work with classmates in real-time sessions.
            </p>
          </div>

          <div className="bg-slate-800 p-8 rounded-3xl">
            <BarChart3 className="w-10 h-10 mb-4 text-purple-400" />
            <h3 className="text-xl font-bold mb-2">Analytics</h3>
            <p className="text-slate-300">
              Track learning progress and performance.
            </p>
          </div>
        </div>
      </section>

      {/* SUBJECTS & TEACHERS */}
      <section id="courses" className="py-24 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">Subjects & bookings</p>
            <h2 className="text-4xl font-black text-white mt-3">Book a teacher and preview the upcoming class calendar</h2>
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="rounded-3xl bg-slate-950/90 p-8 shadow-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                  <CalendarDays className="w-8 h-8 text-indigo-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">What to expect</h3>
                    <p className="text-slate-400">Choose a subject, see the teacher calendar, and book a lesson today.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { subject: "Digital Marketing", topic: "Email campaigns & social ads" },
                    { subject: "Web Development", topic: "React components & deployment" },
                    { subject: "Data Science", topic: "Analytics pipelines & visualization" },
                    { subject: "Design & Branding", topic: "UI systems and identity" },
                  ].map((item) => (
                    <div key={item.subject} className="rounded-3xl bg-slate-800 p-5">
                      <p className="text-sm uppercase tracking-[0.18em] text-indigo-300">{item.subject}</p>
                      <p className="mt-3 text-slate-100">{item.topic}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-xl border border-slate-700">
                <h3 className="text-2xl font-bold mb-4">Book a teacher</h3>
                {!isLoggedIn ? (
                  <div className="space-y-4">
                    <p className="text-slate-600">Sign in to request a teacher booking and select your preferred time.</p>
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full rounded-3xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-700"
                    >
                      Login to book
                    </button>
                    <button
                      onClick={() => navigate("/signup")}
                      className="w-full rounded-3xl border border-slate-300 px-5 py-3 text-slate-800 font-semibold hover:bg-slate-100"
                    >
                      Sign up now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Subject</label>
                      <select
                        value={bookingSubject}
                        onChange={(event) => setBookingSubject(event.target.value)}
                        className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
                      >
                        {SUBJECTS.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Teacher</label>
                      <select
                        value={bookingTeacher}
                        onChange={(event) => setBookingTeacher(event.target.value)}
                        className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
                      >
                        {teachers.map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.full_name || teacher.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Topic</label>
                      <input
                        value={bookingTopic}
                        onChange={(event) => setBookingTopic(event.target.value)}
                        placeholder="E.g. Instagram funnels"
                        className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Preferred date</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                        className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
                      />
                    </div>

                    {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}
                    {bookingMessage && <p className="text-sm text-emerald-600">{bookingMessage}</p>}

                    <button
                      onClick={handleBookTeacher}
                      className="w-full rounded-3xl bg-indigo-600 px-5 py-3 text-white font-semibold hover:bg-indigo-700"
                    >
                      Request booking
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-3xl bg-slate-950/90 p-8 shadow-xl border border-slate-700">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">Teacher calendar</h3>
                    <p className="text-slate-400">Upcoming classes from available teachers.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {courseSessions.length === 0 ? (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
                      No upcoming classes are scheduled yet.
                    </div>
                  ) : (
                    courseSessions.slice(0, 5).map((session) => {
                      const teacher = teachers.find((item) => item.id === session.teacher_id);
                      return (
                        <div key={session.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                          <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">{session.status}</p>
                          <h4 className="mt-2 text-xl font-bold text-white">{session.title}</h4>
                          <p className="mt-2 text-slate-400">{session.description}</p>
                          <p className="mt-3 text-sm text-slate-500">
                            Teacher: {teacher?.full_name || teacher?.email || "Unknown"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">Room: {session.room_name}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-950/90 p-8 shadow-xl border border-slate-700">
                <h3 className="text-2xl font-bold text-white mb-6">Subjects to expect</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SUBJECTS.map((subjectName) => (
                    <div key={subjectName} className="rounded-3xl bg-slate-900 p-5">
                      <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">{subjectName}</p>
                      <p className="mt-3 text-slate-300">Deep dive sessions, live teacher support, and strategy labs.</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
        <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-4 gap-10 text-center">
          <div>
            <h3 className="text-4xl font-black">12,000+</h3>
            <p className="text-slate-400">Students</p>
          </div>
          <div>
            <h3 className="text-4xl font-black">500+</h3>
            <p className="text-slate-400">Teachers</p>
          </div>
          <div>
            <h3 className="text-4xl font-black">1,200+</h3>
            <p className="text-slate-400">Courses</p>
          </div>
          <div>
            <h3 className="text-4xl font-black">99.9%</h3>
            <p className="text-slate-400">Uptime</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center max-w-4xl mx-auto px-8">
        <h2 className="text-4xl font-black mb-6">
          Start Learning Today
        </h2>
        <p className="text-slate-400 mb-10">
          Join thousands of students already using DCONS.
        </p>

        <button
          onClick={() => navigate("/login")}
          className="bg-indigo-600 px-10 py-4 rounded-2xl font-bold hover:scale-105 transition"
        >
          Get Started
        </button>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-10 text-center text-slate-500">
        © 2026 DCONS Learning Platform
      </footer>
    </div>
  );
}