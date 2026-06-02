import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [method, setMethod] = useState<"otp" | "password">("otp");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    };
    checkAuth();
  }, [navigate]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/classroom`,
        },
      });

      if (err) {
        setError(err.message);
      } else {
        setStep("otp");
      }
    } catch (err) {
      setError("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

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
          .select("role")
          .eq("id", data.session.user.id)
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
    } catch (err) {
      setError("Failed to sign in with password");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (err) {
        setError(err.message);
      } else {
        // Check user role and redirect
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
      }
    } catch (err) {
      setError("Failed to verify OTP");
    } finally {
      setLoading(false);
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

        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => setMethod("otp")}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${method === "otp" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
          >
            Email OTP
          </button>
          <button
            type="button"
            onClick={() => setMethod("password")}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${method === "password" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
          >
            Password Login
          </button>
        </div>

        {method === "otp" ? (
          step === "email" ? (
            <form onSubmit={handleSendOTP}>
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Enter OTP Code
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  We sent a 6-digit code to {email}
                </p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full px-4 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setEmail("");
                }}
                className="w-full mt-2 text-blue-600 hover:text-blue-700 py-2 text-sm"
              >
                Use different email
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handlePasswordLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dcons.local"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Signing in..." : "Sign in with password"}
            </button>
          </form>
        )}

        <p className="text-xs text-gray-500 text-center mt-6">
          Demo: admin@dcons.local — use password login for admin, OTP for other users.
        </p>
      </div>
    </div>
  );
}
