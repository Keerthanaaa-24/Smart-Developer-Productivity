import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { loginUser } from "../api/authApi";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    setErrorMsg("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setErrorMsg("Please enter your username/email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const data = await loginUser(formData);

      if (data?.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem(
          "user",
          JSON.stringify({
            username: formData.username,
            email: formData.username,
          })
        );

        if (auth && auth.login) {
          auth.login(data.access_token);
        }

        navigate("/dashboard");
      } else {
        throw new Error("No access token returned by server");
      }
    } catch (error) {
      console.error("Login failed:", error);
      let detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        detail = detail.map((err) => err.msg || JSON.stringify(err)).join(", ");
      } else if (typeof detail === "object" && detail !== null) {
        detail = detail.msg || JSON.stringify(detail);
      } else if (!detail) {
        detail = error.message || "Invalid username/email or password.";
      }
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">
        Smart Developer Dashboard
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
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