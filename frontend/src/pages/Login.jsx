import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { loginUser, checkBackendHealth } from "../api/authApi";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [serverStatus, setServerStatus] = useState("checking"); // 'checking' | 'ready' | 'waking'

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  // Proactively pre-warm backend on component mount (safe idempotent GET /health)
  useEffect(() => {
    let isMounted = true;
    checkBackendHealth()
      .then((res) => {
        if (!isMounted) return;
        if (res.ok) {
          setServerStatus("ready");
        } else {
          setServerStatus("waking");
        }
      })
      .catch(() => {
        if (isMounted) setServerStatus("waking");
      });

    const handleColdStart = () => {
      if (isMounted) setServerStatus("waking");
    };

    window.addEventListener("backend-cold-start", handleColdStart);
    return () => {
      isMounted = false;
      window.removeEventListener("backend-cold-start", handleColdStart);
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
    if (!formData.username.trim() || !formData.password.trim()) {
      setErrorMsg("Please enter your username/email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setIsTimeoutError(false);

    try {
      const data = await loginUser(formData);

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

        navigate("/dashboard");
      } else {
        throw new Error("No access token returned by server");
      }
    } catch (error) {
      console.error("Login failed:", error);

      const isTimeout =
        error.code === "ECONNABORTED" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));
      const isNetwork =
        !error.response ||
        (typeof error.message === "string" && error.message.includes("Network Error"));
      const isServer5xx = [502, 503, 504].includes(error.response?.status);

      if (isTimeout || isNetwork || isServer5xx) {
        setIsTimeoutError(true);
        setServerStatus("waking");
        setErrorMsg(
          error.response?.data?.detail ||
          "The server is taking longer than expected to respond (backend may be spinning up from idle state). Please try again in a moment."
        );
      } else if (error.response?.status === 401) {
        setErrorMsg("Invalid username/email or password.");
      } else if (error.response?.status === 500) {
        setErrorMsg("Internal server error occurred. Please try again shortly.");
      } else if (error.friendlyMessage) {
        setErrorMsg(error.friendlyMessage);
      } else {
        let detail = error.response?.data?.detail;
        if (Array.isArray(detail)) {
          detail = detail.map((err) => err.msg || JSON.stringify(err)).join(", ");
        } else if (typeof detail === "object" && detail !== null) {
          detail = detail.msg || JSON.stringify(detail);
        } else if (!detail) {
          detail = "Invalid username/email or password.";
        }
        setErrorMsg(detail);
      }
    } finally {
      setLoading(false);
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
          className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2"
        >
          <span className="animate-pulse text-base">⚡</span>
          <span>
            Backend service is waking up from idle state. Requests may take a moment to initialize.
          </span>
        </div>
      )}

      {errorMsg && (
        <div
          id="login-error-message"
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex flex-col gap-2"
        >
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold">⚠️</span>
            <div className="flex-1">{errorMsg}</div>
          </div>
          {isTimeoutError && (
            <button
              type="button"
              id="login-retry-button"
              onClick={handleSubmit}
              disabled={loading}
              className="self-end mt-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
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
            className="w-full border border-slate-300 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onChange={handleChange}
            autoComplete="username"
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
              className="w-full border border-slate-300 p-3.5 rounded-lg pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              id="login-toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          id="login-submit-button"
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <span>Login</span>
          )}
        </button>

        <div className="text-center text-sm text-slate-500 pt-2">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;