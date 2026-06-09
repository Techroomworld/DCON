import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, GraduationCap, Lightbulb, Atom, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

const DEFAULT_ADMIN_EMAIL = "dcon@admin.com";

async function resolveUserRole(session: Session) {
  const email = session.user.email?.toLowerCase() || "";

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profileError) {
    return { role: null as string | null, error: profileError };
  }

  if (userData?.role) {
    return { role: userData.role, error: null };
  }

  if (email === DEFAULT_ADMIN_EMAIL) {
    const { error: insertError } = await supabase.from("users").insert({
      id: session.user.id,
      email,
      role: "admin",
      can_login: true,
      approved: true,
      full_name: "DCONS Administrator",
    });

    if (insertError) {
      return { role: null, error: insertError };
    }

    return { role: "admin", error: null };
  }

  return { role: null, error: null };
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { role, error: profileError } = await resolveUserRole(session);
      if (profileError || !role) return;

      if (role === "admin") {
        navigate("/admin");
      } else if (role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
    };

    redirectIfLoggedIn();
  }, [navigate]);

  const handleGoHome = () => navigate("/");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const session = data.session;
    if (!session) {
      setSuccess("Please check your email for a confirmation link before signing in.");
      setLoading(false);
      return;
    }

    const { role, error: profileError } = await resolveUserRole(session);

    if (profileError) {
      setError("Unable to determine your account role. Please try again or contact support.");
      setLoading(false);
      return;
    }

    if (!role) {
      setError(
        "Your account exists, but your profile is not fully configured. Please contact support if this continues."
      );
      setLoading(false);
      return;
    }

    if (role === "admin") {
      navigate("/admin");
    } else if (role === "teacher") {
      navigate("/teacher");
    } else {
      navigate("/student");
    }

    setLoading(false);
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

      <div className="relative min-h-screen bg-linear-to-br from-slate-950 via-blue-950 to-violet-900 flex items-center justify-center p-4">
        <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full">
          <div className="absolute inset-x-0 top-0 h-2 bg-linear-to-r from-cyan-400 via-blue-500 to-fuchsia-500" />
          <div className="relative">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-lg shadow-cyan-500/10">
                <Sparkles className="h-5 w-5" />
                Supabase login enabled
              </div>
              <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-white">DCONS Login</h1>
              <p className="mt-3 text-slate-300">Enter your Supabase credentials to access the admin, teacher, or student dashboard.</p>
            </div>

            {error && (
              <div className="rounded-3xl bg-rose-500/10 border border-rose-400/30 px-4 py-3 text-rose-100 mb-6">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-3xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 text-emerald-100 mb-6">
                {success}
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
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-3xl bg-linear-to-r from-cyan-500 to-indigo-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <Atom className="h-4 w-4 text-cyan-300" />
                Your login is verified through Supabase.
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <GraduationCap className="h-4 w-4 text-violet-300" />
                Please verify your account if email confirmation is required.
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <BookOpen className="h-4 w-4 text-indigo-300" />
                Admin, teacher, and student redirects are based on your profile role.
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
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
