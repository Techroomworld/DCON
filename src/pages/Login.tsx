import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles, GraduationCap, Lightbulb, Atom } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authInitializing, setAuthInitializing] = useState(true);

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = userData?.role || "student";
        if (role === "admin") {
          navigate("/admin");
        } else if (role === "teacher") {
          navigate("/teacher");
        } else {
          navigate("/student");
        }
      }
      // mark initial auth check complete so pages don't redirect prematurely
      setAuthInitializing(false);
    };
    checkAuth();
  }, [navigate]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (err) {
        setError(err.message);
      } else if (data.session) {
        const { data: userData } = await supabase
          .from("users")
          .select("role, can_login")
          .eq("id", data.session.user.id)
          .single();

        if (userData?.can_login === false) {
          await supabase.auth.signOut();
          setError("Your account is not yet permitted to sign in.");
          return;
        }

        const role = userData?.role || "student";
        if (role === "admin") {
          navigate("/admin");
        } else if (role === "teacher") {
          navigate("/teacher");
        } else {
          navigate("/student");
        }
      } else {
        // Some auth flows (redirects/magic links) may not provide a session immediately.
        // Wait for auth state change once and then proceed.
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session) {
            const { data: userData } = await supabase
              .from("users")
              .select("role, can_login")
              .eq("id", session.user.id)
              .single();

            if (userData?.can_login === false) {
              await supabase.auth.signOut();
              setError("Your account is not yet permitted to sign in.");
              listener.subscription.unsubscribe();
              setLoading(false);
              return;
            }

            const role = userData?.role || "student";
            if (role === "admin") {
              navigate("/admin");
            } else if (role === "teacher") {
              navigate("/teacher");
            } else {
              navigate("/student");
            }

            listener.subscription.unsubscribe();
            setLoading(false);
          }
        });
      }
    } catch (err) {
      setError("Failed to sign in with password");
    } finally {
      // keep loading false here only if not handled by onAuthStateChange
      if (!loading) setLoading(false);
    }
  };

  if (authInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-700/50 p-10 shadow-2xl text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-cyan-400 animate-float-edu" />
          <h2 className="text-2xl font-semibold text-white">Preparing your learning portal...</h2>
          <p className="mt-3 text-slate-300">Checking your authentication state before redirecting.</p>
        </div>
      </div>
    );
  }

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
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl max-w-md w-full">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" />
          <div className="relative">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-semibold text-cyan-200 shadow-lg shadow-cyan-500/10">
                <Sparkles className="h-5 w-5" />
                Fast, secure login for students, teachers, and admins
              </div>
              <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-white">DCONS Portal</h1>
              <p className="mt-3 text-slate-300">Sign in to continue your classes, teacher bookings and resource downloads.</p>
            </div>
            {error && (
              <div className="rounded-3xl bg-red-500/10 border border-red-400/30 px-4 py-3 text-red-200 mb-6">
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
                Secure Supabase authentication and class access.
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <GraduationCap className="h-4 w-4 text-violet-300" />
                Personalized flows for students, teachers, and admins.
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <BookOpen className="h-4 w-4 text-indigo-300" />
                Access learning resources and course downloads.
              </div>
            </div>
            <div className="mt-8 text-center text-slate-400">
              <p>Don’t have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="font-semibold text-cyan-300 hover:text-cyan-100"
                >
                  Sign up now
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
