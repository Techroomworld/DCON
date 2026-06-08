import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, GraduationCap, FileText, ClipboardList } from "lucide-react";
import { supabase } from "../lib/supabase";

type TeacherRecord = {
  id: string;
  email: string;
  full_name?: string;
};

const COURSE_CATEGORIES = [
  {
    label: "Science Courses",
    options: [
      "Medicine",
      "Nursing",
      "Pharmacy",
      "Computer Science",
      "Engineering",
      "Microbiology",
      "Biochemistry",
      "Physics",
      "Chemistry",
      "Mathematics",
    ],
  },
  {
    label: "Art / Humanities Courses",
    options: [
      "Law",
      "English Language",
      "Mass Communication",
      "International Relations",
      "Political Science",
      "History",
      "Theatre Arts",
      "Linguistics",
      "Philosophy",
    ],
  },
  {
    label: "Commercial / Management Courses",
    options: [
      "Accounting",
      "Business Administration",
      "Economics",
      "Banking and Finance",
      "Marketing",
      "Public Administration",
      "Insurance",
    ],
  },
  {
    label: "Education Courses",
    options: [
      "Education & English",
      "Education & Biology",
      "Education & Mathematics",
      "Guidance and Counselling",
      "Educational Management",
    ],
  },
  {
    label: "Social Science Courses",
    options: [
      "Sociology",
      "Psychology",
      "Criminology",
      "Geography",
      "Social Work",
    ],
  },
  {
    label: "Agricultural Courses",
    options: [
      "Agriculture",
      "Animal Science",
      "Fisheries",
      "Forestry",
    ],
  },
  {
    label: "Technology Courses",
    options: [
      "Information Technology",
      "Software Engineering",
      "Cybersecurity",
      "Data Science",
      "Artificial Intelligence",
    ],
  },
  {
    label: "Finance Courses",
    options: [
      "Finance",
      "Banking and Finance",
      "Financial Management",
      "Accounting and Finance",
      "Investment Management",
      "Corporate Finance",
      "Public Finance",
    ],
  },
];

const SUBJECTS = COURSE_CATEGORIES.flatMap((category) => category.options);

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [teacherId, setTeacherId] = useState("");
  const [topic, setTopic] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoHome = () => navigate('/');

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session) {
          navigate("/student");
          return;
        }

        const { data, error: teacherError } = await supabase
          .from("users")
          .select("id, email, full_name")
          .eq("role", "teacher");

        if (teacherError) {
          if (isMounted) {
            setError("Unable to load teachers.");
          }
          return;
        }

        if (isMounted) {
          setTeachers(data || []);
          if (data && data.length > 0) {
            setTeacherId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Signup auth check failed:", err);
        if (isMounted) {
          setError("Unable to verify your session. Please try again.");
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email, and password are required.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Signup succeeded but no user ID was returned. Please log in.");
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from("users").insert({
        id: userId,
        email: email.toLowerCase(),
        full_name: name.trim(),
        role: "student",
        can_login: true,
        approved: false,
        subject_interest: subject,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        setError(`Signup failed during profile creation: ${profileError.message}`);
        setLoading(false);
        return;
      }

      if (teacherId) {
        const bookingPayload: Record<string, any> = {
          teacher_id: teacherId,
          student_id: userId,
          subject,
          topic: topic.trim() || `Intro to ${subject}`,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (preferredDate) {
          bookingPayload.scheduled_at = new Date(preferredDate).toISOString();
        }

        await supabase.from("teacher_bookings").insert(bookingPayload);
      }

      setSuccess("Account created successfully. Please log in to continue. Your student account will need teacher approval before joining classes.");
      setName("");
      setEmail("");
      setPassword("");
      setTopic("");
      setPreferredDate("");
      setLoading(false);
    } catch (err) {
      setError("Unexpected signup error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl animate-pulse" />
      <div className="absolute right-10 top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
      <div className="absolute inset-x-0 bottom-8 flex justify-center gap-6 opacity-30">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 shadow-lg shadow-cyan-500/10 animate-float-edu">
          <BookOpen className="h-10 w-10 text-cyan-300" />
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 shadow-lg shadow-violet-500/10 animate-float-edu delay-150">
          <GraduationCap className="h-10 w-10 text-violet-300" />
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 shadow-lg shadow-amber-500/10 animate-float-edu delay-300">
          <Sparkles className="h-10 w-10 text-amber-300" />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-4">
        <div className="relative grid w-full gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/95 px-6 py-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl md:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-inner shadow-cyan-500/5">
                <Sparkles className="h-4 w-4" /> Explore your perfect course and teacher match.
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-white">Create your student account</h1>
                  <p className="max-w-2xl text-slate-300">
                    Book expert teachers, discover new classes, and download digital marketing resources, past questions, and e-books for every subject.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGoHome}
                  className="rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-sm font-medium text-cyan-200 hover:bg-slate-900"
                >
                  ← Back to home
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-3xl bg-rose-500/10 border border-rose-400/30 p-4 text-rose-100">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-3xl bg-emerald-500/10 border border-emerald-400/30 p-4 text-emerald-100">
                {success}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-5">
                <div className="flex items-center gap-3 text-cyan-300">
                  <FileText className="h-5 w-5" />
                  <span className="font-semibold">Digital Marketing</span>
                </div>
                <p className="mt-3 text-slate-400 text-sm">
                  Learn marketing, create winning campaigns, and download ready-to-use guides for your next project.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-5">
                <div className="flex items-center gap-3 text-violet-300">
                  <ClipboardList className="h-5 w-5" />
                  <span className="font-semibold">Resource downloads</span>
                </div>
                <p className="mt-3 text-slate-400 text-sm">
                  Get access to free study guides, past questions, and printable class notes right from your student dashboard.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Available course groups</p>
                  <h2 className="text-2xl font-bold text-white">Popular study tracks</h2>
                </div>
                <GraduationCap className="h-10 w-10 text-slate-300" />
              </div>
              <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                {COURSE_CATEGORIES.map((category) => (
                  <div key={category.label} className="rounded-3xl border border-slate-700/50 bg-slate-950/70 p-3">
                    <h3 className="font-semibold text-white">{category.label}</h3>
                    <p className="mt-2 text-slate-400 text-sm leading-snug">
                      {category.options.slice(0, 3).join(', ')}{category.options.length > 3 ? ', ...' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-[1.75rem] border border-cyan-300/10 bg-slate-950/80 p-8 shadow-xl shadow-cyan-500/10">
            <div className="flex items-center gap-3 text-cyan-300">
              <BookOpen className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-[0.35em]">Student signup</span>
            </div>
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200">Full name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  placeholder="Jane Doe"
                  required
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">Email address</label>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">Password</label>
                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Choose a secure password"
                    required
                    className="w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-semibold text-cyan-300 hover:text-cyan-100"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">Course selection</label>
                <select
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                >
                  {COURSE_CATEGORIES.map((category) => (
                    <optgroup key={category.label} label={category.label}>
                      {category.options.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">Preferred teacher</label>
                <select
                  value={teacherId}
                  onChange={(event) => setTeacherId(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name || teacher.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">Preferred meeting date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(event) => setPreferredDate(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200">Topic you want to learn</label>
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  type="text"
                  placeholder="E.g. digital marketing strategy, AI fundamentals"
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Sign up and book teacher"}
              </button>
            </form>
            <div className="rounded-3xl border border-slate-700/60 bg-slate-950/90 p-4 text-sm text-slate-300">
              <p>Prefer guided learning? Our teacher booking system includes:</p>
              <ul className="mt-3 space-y-2 text-slate-400">
                <li>• Personalized class schedules</li>
                <li>• Digital marketing and tech course support</li>
                <li>• Downloadable resources for every subject</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="w-full rounded-3xl border border-cyan-400/30 bg-slate-900/90 px-6 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/10"
            >
              <FileText className="mr-2 inline h-4 w-4" /> Browse resources
            </button>
            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-semibold text-cyan-300 hover:text-cyan-100"
              >
                Login instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
