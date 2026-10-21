import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");
    if (token && token !== "null" && token !== "undefined") {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const role = (user?.role || "").toLowerCase();
        if (role === "admin" || role === "superadmin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        // Ignore parse error
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4">
      <h1 className="text-4xl sm:text-6xl font-bold mb-6 text-center tracking-tight">
        Smart Developer Productivity Dashboard 🚀
      </h1>

      <p className="text-lg sm:text-xl mb-8 text-center max-w-2xl text-blue-100">
        Track coding productivity, manage tasks,
        analyze performance, and boost focus
        with AI-powered insights.
      </p>

      <div className="flex gap-4 sm:gap-5 flex-wrap justify-center">
        <Link
          to="/login"
          className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-blue-50 transition"
        >
          Student Login
        </Link>

        <Link
          to="/register"
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-slate-800 transition"
        >
          Create Account
        </Link>
      </div>

      <div className="mt-12 text-center text-xs text-blue-200">
        <span>Platform Governance: </span>
        <Link to="/admin/login" className="underline hover:text-white font-medium">
          Admin Console
        </Link>
      </div>
    </div>
  );
};

export default Home;