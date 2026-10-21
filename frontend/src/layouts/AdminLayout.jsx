import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FaShieldAlt,
  FaUsers,
  FaChartLine,
  FaCertificate,
  FaHeartbeat,
  FaHistory,
  FaArrowLeft,
  FaBars,
  FaTimes,
  FaSun,
  FaMoon,
  FaSignOutAlt,
  FaTrophy,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import useAuth from "../hooks/useAuth";

const adminNavItems = [
  {
    title: "Overview",
    path: "/admin",
    icon: <FaShieldAlt />,
    exact: true,
  },
  {
    title: "Students",
    path: "/admin/students",
    icon: <FaUsers />,
  },
  {
    title: "Score & Streak Audit",
    path: "/admin/audit",
    icon: <FaTrophy />,
  },
  {
    title: "Achievements & Certs",
    path: "/admin/achievements",
    icon: <FaCertificate />,
  },
  {
    title: "Platform Health",
    path: "/admin/health",
    icon: <FaHeartbeat />,
  },
  {
    title: "Platform Analytics",
    path: "/admin/analytics",
    icon: <FaChartLine />,
  },
  {
    title: "Security & Audit Logs",
    path: "/admin/logs",
    icon: <FaHistory />,
  },
];

const AdminSidebarContent = ({ onItemClick, isMobile = false }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* BRAND & LOGO */}
        <div className="mb-8 px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center text-lg font-black shadow-md shadow-indigo-500/25 shrink-0">
              <FaShieldAlt />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-2">
                Governance
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Admin
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Smart Developer Platform
              </p>
            </div>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={onItemClick}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close admin navigation"
            >
              <FaTimes className="text-lg" />
            </button>
          )}
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="space-y-1.5" aria-label="Admin Navigation">
          {adminNavItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* FOOTER SYSTEM BADGE */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Platform Core Active</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Admin Governance & RBAC
          </p>
        </div>
      </div>
    </div>
  );
};

const AdminLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const auth = useAuth();
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const username = auth?.user?.username || storedUser?.username || "Admin";
  const userRole = auth?.user?.role || storedUser?.role || "admin";

  const handleLogout = () => {
    if (auth && auth.logout) {
      auth.logout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-100/90 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 w-64 min-h-screen p-5 shrink-0">
        <AdminSidebarContent />
      </aside>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 h-full p-5 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <AdminSidebarContent
              onItemClick={() => setIsMobileMenuOpen(false)}
              isMobile={true}
            />
          </aside>
        </div>
      )}

      {/* MAIN ADMIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {/* ADMIN TOPBAR */}
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
          <div className="h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
            {/* LEFT HAMBURGER & PATH */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Open admin menu"
              >
                <FaBars className="text-lg" />
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden sm:inline-block">
                  Platform Core Operational
                </span>
              </div>
            </div>

            {/* RIGHT ADMIN CONTROLS */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <FaSun className="text-base text-amber-400" />
                ) : (
                  <FaMoon className="text-base text-indigo-600" />
                )}
              </button>

              {/* ADMIN CHIP */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {username}
                  </p>
                  <p className="text-[10px] uppercase font-black tracking-wider text-purple-600 dark:text-purple-400">
                    {userRole}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
              >
                <FaSignOutAlt className="text-sm" />
              </button>
            </div>
          </div>
        </header>

        {/* ADMIN CONTENT */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
