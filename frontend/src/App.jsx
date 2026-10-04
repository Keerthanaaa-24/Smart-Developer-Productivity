import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AuthProvider from "./context/AuthContext";
import ThemeProvider from "./context/ThemeContext";
import ProtectedRoute from "./components/common/ProtectedRoute";

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
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {/* =====================================================
                  PUBLIC ROUTES
              ===================================================== */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* =====================================================
                  APPLICATION ROUTES (PROTECTED)
              ===================================================== */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <Activity />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pomodoro"
                element={
                  <ProtectedRoute>
                    <Pomodoro />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/github"
                element={
                  <ProtectedRoute>
                    <GithubIntegration />
                  </ProtectedRoute>
                }
              />

              {/* =====================================================
                  FALLBACK
              ===================================================== */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;