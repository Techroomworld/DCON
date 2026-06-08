import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">DCONS</h1>
        <p className="text-gray-600 text-center mb-6">Real-time Education Platform</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Don’t have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              Sign up now
            </button>
          </p>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Use your email and password to sign in. Students can also sign up for a new account.
          Teacher and admin accounts must be created by an existing admin.
        </p>
      </div>
    </div>
  );
}
