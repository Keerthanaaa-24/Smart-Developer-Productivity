import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { loginUser, checkBackendHealth } from "../api/authApi";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slowNotice, setSlowNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [serverStatus, setServerStatus] = useState("idle"); // 'idle' | 'ready' | 'waking'

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const abortCtrlRef = useRef(null);
  const slowTimerRef = useRef(null);

  // Proactively check backend readiness once on screen load
  useEffect(() => {
    let isMounted = true;
    checkBackendHealth(0, 0)
      .then((res) => {
        if (isMounted && res?.ok) {
          setServerStatus("idle");
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  // Listen for backend connection status events
  useEffect(() => {
    let isMounted = true;
    let autoDismissTimer = null;

    const handleColdStart = () => {
      if (isMounted) {
        setServerStatus("waking");
        if (autoDismissTimer) clearTimeout(autoDismissTimer);
        autoDismissTimer = setTimeout(() => {
          if (isMounted) setServerStatus("idle");
        }, 12000);
      }
    };

    const handleWarmed = () => {
      if (isMounted) setServerStatus("idle");
    };

    const handleReport = (event) => {
      const s = event.detail?.status;
      if (s === "ready" || s === "idle") {
        if (isMounted) setServerStatus("idle");
      } else if (s === "cold_start") {
        handleColdStart();
      } else if (s === "database_unavailable") {
        if (isMounted) setServerStatus("waking");
      }
    };

    window.addEventListener("backend-cold-start", handleColdStart);
    window.addEventListener("backend-warmed", handleWarmed);
    window.addEventListener("backend-status-report", handleReport);
    return () => {
      isMounted = false;
      if (autoDismissTimer) clearTimeout(autoDismissTimer);
      window.removeEventListener("backend-cold-start", handleColdStart);
      window.removeEventListener("backend-warmed", handleWarmed);
      window.removeEventListener("backend-status-report", handleReport);
    };
  }, []);

  const handleChange = (e) => {
    setErrorMsg("");
    setIsTimeoutError(false);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // STRICT LOCK: Prevent concurrent or duplicate form submissions
    if (loading) return;

    if (!formData.username.trim() || !formData.password.trim()) {
      setErrorMsg("Please enter your username/email and password.");
      return;
    }

    // Cancel any prior in-flight request
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const controller = new AbortController();
    abortCtrlRef.current = controller;

    setLoading(true);
    setSlowNotice(false);
    setErrorMsg("");
    setIsTimeoutError(false);

    // If login takes > 3.5s (e.g. cold start), show live reassuring status to user
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setSlowNotice(true);
    }, 3500);

    try {
      const data = await loginUser(formData, { signal: controller.signal });

      if (data?.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("access_token", data.access_token);
        const userData = data.user || {
          username: formData.username,
          email: formData.username,
        };
        localStorage.setItem("user", JSON.stringify(userData));

        if (auth && auth.login) {
          auth.login(data.access_token, userData);
        }

        const userRole = (userData?.role || "").toLowerCase();
        if (userRole === "admin" || userRole === "superadmin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        throw new Error("No access token returned by server");
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return; // Request was aborted cleanly, ignore
      }
      console.error("Login failed:", error);

      const status = error.response?.status;
      const isTimeout =
        error.code === "ECONNABORTED" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));
      const isNetwork =
        !error.response &&
        (typeof error.message === "string" && (error.message.includes("Network Error") || error.code === "ERR_NETWORK"));
      const is503 = status === 503;
      const is500 = status === 500;
      const is401 = status === 401;
      const is403 = status === 403;
      const is429 = status === 429;

      if (is401) {
        setServerStatus("idle");
        setIsTimeoutError(false);
        setErrorMsg("Invalid username/email or password. Please verify your credentials.");
      } else if (is403) {
        setServerStatus("idle");
        setIsTimeoutError(false);
        setErrorMsg(error.response?.data?.detail || "Account has been suspended. Please contact platform administrator.");
      } else if (is429) {
        setServerStatus("idle");
        setIsTimeoutError(false);
        setErrorMsg("Too many login attempts. Please wait a minute and try again.");
      } else if (is500) {
        setServerStatus("idle");
        setIsTimeoutError(false);
        setErrorMsg("Internal server error occurred. Please try again shortly.");
      } else if (isTimeout || is503 || isNetwork || [502, 504].includes(status)) {
        setIsTimeoutError(true);
        setServerStatus("waking");
        if (is503) {
          setErrorMsg(
            error.response?.data?.detail ||
            "Database service is warming up or temporarily unreachable. Please click Retry in a moment."
          );
        } else if (isTimeout) {
          setErrorMsg(
            "The login request timed out while waiting for server response. The free-tier backend may be spinning up from idle state. Please click Retry."
          );
        } else {
          setErrorMsg(
            "Unable to reach the backend service. It may be waking up from cold-start or your network connection is offline. Please retry."
          );
        }
      } else if (error.friendlyMessage) {
        setServerStatus("idle");
        setIsTimeoutError(false);
        setErrorMsg(error.friendlyMessage);
      } else {
        setServerStatus("idle");
        setIsTimeoutError(false);
        let detail = error.response?.data?.detail;
        if (Array.isArray(detail)) {
          detail = detail.map((err) => err.msg || JSON.stringify(err)).join(", ");
        } else if (typeof detail === "object" && detail !== null) {
          detail = detail.msg || JSON.stringify(detail);
        } else if (!detail) {
          detail = "Failed to sign in. Please check your credentials and try again.";
        }
        setErrorMsg(detail);
      }
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setLoading(false);
      setSlowNotice(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-4xl font-bold text-center mb-6 text-blue-600">
        Smart Developer Dashboard
      </h1>

      {serverStatus === "waking" && (
        <div
          id="backend-waking-banner"
          className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 shadow-sm animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-base">⚡</span>
            <span>
              Backend service is waking up from idle state. Requests may take a moment to initialize.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setServerStatus("idle")}
            className="text-amber-700 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            title="Dismiss status banner"
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          id="login-error-message"
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex flex-col gap-2 animate-fadeIn"
        >
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold">⚠️</span>
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
          {isTimeoutError && (
            <button
              type="button"
              id="login-retry-button"
              onClick={handleSubmit}
              disabled={loading}
              className="self-end mt-1 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? "Retrying..." : "Retry Login"}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Username or Email
          </label>
          <input
            type="text"
            id="login-username-input"
            name="username"
            value={formData.username}
            placeholder="Enter username or email"
            className="w-full border border-slate-300 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition"
            onChange={handleChange}
            autoComplete="username"
            disabled={loading}
            required
          />
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="login-password-input"
              name="password"
              value={formData.password}
              placeholder="Enter password"
              className="w-full border border-slate-300 p-3.5 rounded-lg pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed transition"
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
              required
            />
            <button
              type="button"
              id="login-toggle-password"
              disabled={loading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          id="login-submit-button"
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-lg font-semibold transition flex flex-col items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed shadow-md cursor-pointer"
        >
          {loading ? (
            <>
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Signing in...</span>
              </div>
              {slowNotice && (
                <span className="text-[11px] font-normal text-blue-200 animate-pulse">
                  Connecting to cloud backend (warming up)...
                </span>
              )}
            </>
          ) : (
            <span>Login</span>
          )}
        </button>

        <div className="text-center text-sm text-slate-500 pt-2 flex flex-col gap-2.5">
          <div>
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Register here
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            Platform Administrator?{" "}
            <Link to="/admin/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Sign in to Admin Console →
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;