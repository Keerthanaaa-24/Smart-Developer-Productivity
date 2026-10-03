import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import { registerUser } from "../api/authApi";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setErrorMsg("");
    setSuccessMsg("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = formData.username.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!cleanUsername || !cleanEmail || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg("Username must be at least 3 characters long.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await registerUser({
        username: cleanUsername,
        email: cleanEmail,
        password: password,
      });

      setSuccessMsg(response?.message || "Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Registration failed:", error);
      let detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        detail = detail.map((err) => err.msg || JSON.stringify(err)).join(", ");
      } else if (typeof detail === "object" && detail !== null) {
        detail = detail.msg || JSON.stringify(detail);
      } else if (!detail) {
        detail = error.message || "Registration failed. Please check your details and try again.";
      }

      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">
        Create Account
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Username
          </label>
          <input
            type="text"
            id="register-username-input"
            name="username"
            value={formData.username}
            placeholder="Choose a username (min 3 chars)"
            className="w-full border border-slate-300 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            id="register-email-input"
            name="email"
            value={formData.email}
            placeholder="name@example.com"
            className="w-full border border-slate-300 p-3.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onChange={handleChange}
            autoComplete="email"
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
              id="register-password-input"
              name="password"
              value={formData.password}
              placeholder="Create a password (min 6 chars)"
              className="w-full border border-slate-300 p-3.5 rounded-lg pr-12 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              id="register-toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          id="register-submit-button"
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Register</span>
          )}
        </button>

        <div className="text-center text-sm text-slate-500 pt-2">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Login here
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;