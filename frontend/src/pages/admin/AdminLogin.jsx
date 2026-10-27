import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaShieldAlt, FaLock, FaUserShield, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import { loginUser, checkBackendHealth } from "../../api/authApi";
import useAuth from "../../hooks/useAuth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Proactively pre-warm backend when administrator opens the login screen
  useEffect(() => {
    checkBackendHealth(1, 1500).catch(() => {});
  }, []);

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (token && token !== "null" && token !== "undefined") {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const role = (stored?.role || "").toLowerCase();
      if (role === "admin" || role === "superadmin") {
        navigate("/admin", { replace: true });
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setErrorMsg("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setErrorMsg("Please enter your administrator username/email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const data = await loginUser(formData);

      if (data?.access_token) {
        const userData = data.user || {};
        const role = (userData.role || "").toLowerCase();

        // STRICT ROLE ENFORCEMENT: Only admin and superadmin may enter
        if (role !== "admin" && role !== "superadmin") {
          // Invalidate stored credentials immediately
          localStorage.removeItem("token");
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          if (auth && auth.logout) auth.logout();

          setErrorMsg(
            "Access Denied: This console is strictly reserved for platform administrators. " +
            "Your account is registered as a student. Please log in through the Student Developer Portal."
          );
          setLoading(false);
          return;
        }

        // Store admin credentials
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user", JSON.stringify(userData));

        if (auth && auth.login) {
          auth.login(data.access_token, userData);
        }

        // Exclusively redirect to Admin Console
        navigate("/admin", { replace: true });
      } else {
        throw new Error("No authorization token received.");
      }
    } catch (error) {
      console.error("Admin sign in error:", error);
      if (error.response?.status === 403) {
        setErrorMsg(error.response?.data?.detail || "Account suspended or unauthorized.");
      } else if (error.response?.status === 401) {
        setErrorMsg("Invalid administrator credentials. Please check your username and password.");
      } else {
        const detail = error.response?.data?.detail || error.message || "Failed to authenticate administrator.";
        setErrorMsg(typeof detail === "string" ? detail : "Authentication error.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* BRAND & SECURITY BADGE */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 shadow-xl shadow-indigo-600/30 mb-4 border border-indigo-400/30">
            <FaShieldAlt className="text-2xl text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Governance Console
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mt-1">
            Authorized Personnel Only
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            Administrative access point for student directory, leaderboard audits, and achievement reviews.
          </p>
        </div>

        {/* CARD CONTAINER */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {errorMsg && (
            <div
              id="admin-login-error"
              className="mb-5 p-3.5 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs font-medium flex items-start gap-2.5 animate-fadeIn"
            >
              <FaExclamationTriangle className="text-red-400 shrink-0 text-sm mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="admin-username-input"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="admin@smartdeveloper.io"
                  required
                  autoComplete="username"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <FaUserShield className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="admin-password-input"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <FaLock className="text-xs" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-admin-submit-login"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <FaShieldAlt className="text-sm" />
                  <span>Authenticate Admin</span>
                </>
              )}
            </button>
          </form>

          {/* AUDIT NOTICE */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 leading-normal">
              🔒 Immutable Security Notice: All authentication requests, client IP addresses, and governance sessions are monitored and recorded.
            </p>
          </div>
        </div>

        {/* BACK TO STUDENT PORTAL */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition"
          >
            <FaArrowLeft className="text-[10px]" />
            <span>Return to Student Developer Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
