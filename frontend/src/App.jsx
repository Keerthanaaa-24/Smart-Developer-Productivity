import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AuthProvider from "./context/AuthContext";
import ThemeProvider from "./context/ThemeContext";
import BackendStatusProvider from "./context/BackendStatusContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import BackendHealthBanner from "./components/common/BackendHealthBanner";

// Lazy-loaded routes for code-splitting and rapid initial bundle loading
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const Activity = lazy(() => import("./pages/Activity"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Pomodoro = lazy(() => import("./pages/Pomodoro"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const GithubIntegration = lazy(() => import("./pages/GithubIntegration"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const PublicPortfolio = lazy(() => import("./pages/PublicPortfolio"));
const CareerImpact = lazy(() => import("./pages/CareerImpact"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Achievements = lazy(() => import("./pages/Achievements"));

// Admin Dashboard & Governance Pages (Lazy Loaded)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminAuditing = lazy(() => import("./pages/admin/AdminAuditing"));
const AdminAchievements = lazy(() => import("./pages/admin/AdminAchievements"));
const AdminHealth = lazy(() => import("./pages/admin/AdminHealth"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));

// Intelligent Role-Aware Redirect
const RoleRedirect = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (!token || token === "null" || token === "undefined") {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = (user?.role || "").toLowerCase();
    if (role === "admin" || role === "superadmin") {
      return <Navigate to="/admin" replace />;
    }
  } catch {
    // Ignore parse errors
  }
  return <Navigate to="/dashboard" replace />;
};

// Responsive route loading skeleton
const PageLoadingFallback = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col p-6 sm:p-8 space-y-6">
    <div className="w-full h-16 bg-slate-200/80 dark:bg-slate-900/60 rounded-2xl animate-pulse border border-slate-300/50 dark:border-slate-800/60" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-36 bg-slate-200/80 dark:bg-slate-900/60 rounded-3xl animate-pulse border border-slate-300/50 dark:border-slate-800/60" />
      <div className="h-36 bg-slate-200/80 dark:bg-slate-900/60 rounded-3xl animate-pulse border border-slate-300/50 dark:border-slate-800/60" />
      <div className="h-36 bg-slate-200/80 dark:bg-slate-900/60 rounded-3xl animate-pulse border border-slate-300/50 dark:border-slate-800/60" />
    </div>
    <div className="w-full h-96 bg-slate-200/80 dark:bg-slate-900/60 rounded-3xl animate-pulse border border-slate-300/50 dark:border-slate-800/60" />
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BackendStatusProvider>
            <BrowserRouter>
              <BackendHealthBanner />
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                {/* =====================================================
                    PUBLIC ROUTES
                ===================================================== */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/register" element={<Register />} />
                <Route path="/portfolio/:slug" element={<PublicPortfolio />} />

                {/* =====================================================
                    APPLICATION ROUTES (PROTECTED - STUDENTS ONLY)
                ===================================================== */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Leaderboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/achievements"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Achievements />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Projects />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/activity"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Activity />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Tasks />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pomodoro"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Pomodoro />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/github"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <GithubIntegration />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/portfolio"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <Portfolio />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/career-impact"
                  element={
                    <ProtectedRoute studentOnly={true}>
                      <CareerImpact />
                    </ProtectedRoute>
                  }
                />

                {/* =====================================================
                    ADMIN ROUTES (PROTECTED - ADMIN AUTHORIZATION REQUIRED)
                ===================================================== */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/students"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminStudents />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/audit"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminAuditing />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/achievements"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminAchievements />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/health"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminHealth />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminAnalytics />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/logs"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <AdminAuditLogs />
                    </ProtectedRoute>
                  }
                />

                {/* =====================================================
                    FALLBACK (INTELLIGENT ROLE-BASED REDIRECT)
                ===================================================== */}
                <Route path="*" element={<RoleRedirect />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </BackendStatusProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;