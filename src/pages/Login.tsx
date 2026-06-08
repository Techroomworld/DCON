import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, GraduationCap, Lightbulb, Atom } from "lucide-react";
import { saveLocalAuth, getLocalAuth } from "../lib/localAuth";
import type { LocalAuthRole } from "../lib/localAuth";

const ROLE_LABELS: Record<LocalAuthRole, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<LocalAuthRole>("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const localUser = getLocalAuth();
    if (localUser) {
      if (localUser.role === "admin") {
        navigate("/admin");
      } else if (localUser.role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
    }
  }, [navigate]);

  const handleGoHome = () => navigate("/");

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    saveLocalAuth({ email: normalizedEmail, role });

    setTimeout(() => {
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute -left-20 top-16 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />
      <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl animate-pulse" />
      <div className="absolute inset-x-0 bottom-10 flex justify-center gap-6 opacity-40">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur animate-float-edu">
          <BookOpen className="h-10 w-10 text-cyan-300" />
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur animate-float-edu delay-150">
          <GraduationCap className="h-10 w-10 text-indigo-300" />
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur animate-float-edu delay-300">
          <Lightbulb className="h-10 w-10 text-yellow-300" />
        </div>
      </div>

      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-violet-900 flex items-center justify-center p-4">
        <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full">
          <div className="absolute inset-x-0 top-0 h-2 bg-linear-to-r from-cyan-400 via-blue-500 to-fuchsia-500" />
          <div className="relative">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-lg shadow-cyan-500/10">
                <Sparkles className="h-5 w-5" />
                Temporary local login mode
              </div>
              <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-white">DCONS Demo Login</h1>
              <p className="mt-3 text-slate-300">Use a simple local login to open teacher, admin, or student routes without Supabase verification.</p>
            </div>

            {error && (
              <div className="rounded-3xl bg-rose-500/10 border border-rose-400/30 px-4 py-3 text-rose-100 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
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
                <label className="mb-2 block text-sm font-semibold text-slate-200">Login As</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as LocalAuthRole)}
                  className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <Atom className="h-4 w-4 text-cyan-300" />
                Temporary local auth only — no Supabase verification.
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <GraduationCap className="h-4 w-4 text-violet-300" />
                Use any password to continue for now.
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <BookOpen className="h-4 w-4 text-indigo-300" />
                Teacher, admin, and student routes are available locally.
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 text-center text-slate-400 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={handleGoHome}
                className="rounded-3xl border border-slate-700/80 bg-slate-950/90 px-5 py-3 text-sm font-semibold text-cyan-200 hover:bg-slate-900"
              >
                ← Back to Home
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-3xl border border-cyan-500/80 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-900"
              >
                Signup Disabled
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
