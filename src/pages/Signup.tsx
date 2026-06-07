import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type TeacherRecord = {
  id: string;
  email: string;
  full_name?: string;
};

const SUBJECTS = [
  "Digital Marketing",
  "Web Development",
  "Data Science",
  "Design & Branding",
  "Business Strategy",
];

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [teacherId, setTeacherId] = useState("");
  const [topic, setTopic] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/student");
        return;
      }

      const { data, error: teacherError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("role", "teacher");

      if (teacherError) {
        setError("Unable to load teachers.");
        return;
      }

      setTeachers(data || []);
      if (data && data.length > 0) {
        setTeacherId(data[0].id);
      }
    };

    init();
  }, [navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Student Signup</h1>
        <p className="text-slate-600 mb-8">
          Create your student account, choose your subject, and request a teacher booking.
          Teacher and admin accounts must be created by an existing admin.
        </p>

        {error && (
          <div className="rounded-3xl bg-red-50 border border-red-200 p-4 text-red-700 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                type="text"
                placeholder="Jane Doe"
                required
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Email address</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                required
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Choose a secure password"
                required
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Subject</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                {SUBJECTS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Preferred teacher</span>
              <select
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name || teacher.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Preferred meeting date</span>
              <input
                type="date"
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Topic you want to learn</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              type="text"
              placeholder="E.g. social media strategy, HTML/CSS basics"
              className="mt-2 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-indigo-600 px-6 py-4 text-white font-semibold hover:bg-indigo-700 transition"
          >
            {loading ? "Creating account..." : "Sign up and book teacher"}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Login instead
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
