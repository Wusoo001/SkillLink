import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Read the "session expired" notice set by the axios interceptor
  useEffect(() => {
    const notice = sessionStorage.getItem("authNotice");
    if (notice) {
      sessionStorage.removeItem("authNotice");
      if (notice === "expired") {
        setSessionNotice("Your session has expired. Please log in again.");
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSessionNotice(""); // clear expired-notice when user retries
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-extrabold text-2xl mb-3">
            S
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Street Admin</h1>
          <p className="text-sm text-inkMuted mt-1">Sign in with your admin account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-inkMuted mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primaryLight outline-none text-ink"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-inkMuted mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primaryLight outline-none text-ink"
              placeholder="••••••••"
            />
          </div>

          {/* Session expired notice — informational, amber */}
          {sessionNotice && (
            <div className="text-sm text-warning bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              {sessionNotice}
            </div>
          )}

          {/* Login error — red, for wrong credentials etc. */}
          {error && (
            <div className="text-sm text-danger bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primaryDark disabled:opacity-60 transition"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}