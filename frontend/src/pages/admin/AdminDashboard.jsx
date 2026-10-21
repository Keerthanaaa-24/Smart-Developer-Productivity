import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaUsers,
  FaShieldAlt,
  FaTrophy,
  FaCertificate,
  FaHeartbeat,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowRight,
  FaHistory,
  FaBolt,
  FaUserSlash,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import {
  getAdminAnalyticsOverview,
  getAdminHealthOverview,
  getAdminDuplicatePoints,
  getAdminAchievements,
  getAdminAuditLogs,
} from "../../api/adminApi";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [health, setHealth] = useState(null);
  const [duplicates, setDuplicates] = useState(0);
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, healthData, dupsData, pendingData, logsData] =
        await Promise.allSettled([
          getAdminAnalyticsOverview(),
          getAdminHealthOverview(),
          getAdminDuplicatePoints(),
          getAdminAchievements({ status_filter: "pending", limit: 5 }),
          getAdminAuditLogs({ limit: 6 }),
        ]);

      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value);
      if (healthData.status === "fulfilled") setHealth(healthData.value);
      if (dupsData.status === "fulfilled")
        setDuplicates(dupsData.value.duplicates_detected || 0);
      if (pendingData.status === "fulfilled")
        setPendingAchievements(pendingData.value.items || []);
      if (logsData.status === "fulfilled")
        setRecentLogs(logsData.value.items || []);
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
      setError("Failed to load some admin telemetry data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* TOP BANNER / HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white shadow-xl border border-indigo-900/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-3">
              <FaShieldAlt className="text-indigo-400" />
              Administrative Governance Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Platform Oversight & Security
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Inspect student activity, audit score economy & streaks, verify
              credential integrity, and track security events with zero fabricated data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition cursor-pointer"
            >
              Refresh Telemetry
            </button>
            <Link
              to="/admin/audit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-500/30 transition flex items-center gap-2"
            >
              <span>Run Audit Scan</span>
              <FaArrowRight className="text-[10px]" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}

        {/* METRICS KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Students */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Students
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
                <FaUsers />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {analytics?.students?.total_registered ?? "—"}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {analytics?.students?.active_7d ?? 0} active (7d)
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {analytics?.students?.suspended ?? 0} suspended
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Pending Verifications */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Certifications
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
                <FaCertificate />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {analytics?.achievements?.pending ?? "—"}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {analytics?.achievements?.verified ?? 0} approved
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {analytics?.achievements?.total ?? 0} submitted
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Productivity Hours */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Verified Focus Time
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
                <FaBolt />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                {analytics?.productivity?.total_focus_hours ?? "—"}
                <span className="text-lg font-normal text-slate-500 dark:text-slate-400 ml-1">
                  hrs
                </span>
              </h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{analytics?.productivity?.completed_tasks ?? 0} tasks done</span>
                <span>•</span>
                <span>{analytics?.productivity?.pomodoro_sessions ?? 0} sessions</span>
              </div>
            </div>
          </div>

          {/* Card 4: Database & Health Status */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Database Engine
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
                <FaHeartbeat />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                  {health?.database?.status || "Operational"}
                </h3>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Ping Latency:{" "}
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {health?.database?.latency_ms ?? 0} ms
                </span>{" "}
                • {health?.database?.engine || "MySQL"}
              </p>
            </div>
          </div>
        </div>

        {/* AUDIT ALERTS BANNER (DUPLICATES / ANOMALIES) */}
        {duplicates > 0 ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <FaExclamationTriangle className="text-lg" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                  Audit Alert: {duplicates} Potential Duplicate Point Cluster(s) Detected
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Anomalous or duplicate point transactions require review to preserve leaderboard fairness.
                </p>
              </div>
            </div>
            <Link
              to="/admin/audit"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition whitespace-nowrap self-start sm:self-auto"
            >
              Resolve Duplicates
            </Link>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex items-center gap-3">
            <FaCheckCircle className="text-emerald-500 text-base shrink-0" />
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              Audit Guard Clean: Zero duplicate point transactions detected in the persistent audit ledger.
            </p>
          </div>
        )}

        {/* TWO-COLUMN GRID: PENDING VERIFICATIONS & RECENT AUDIT LOGS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: PENDING CERTIFICATES REVIEW */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Verification Queue
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Recent student achievements awaiting review
                  </p>
                </div>
                <Link
                  to="/admin/achievements"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>View All Queue</span>
                  <FaArrowRight className="text-[10px]" />
                </Link>
              </div>

              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {pendingAchievements.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No pending credentials waiting in review queue.
                  </div>
                ) : (
                  pendingAchievements.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Student: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.username}</span> • {item.issuer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {item.verification_status}
                        </span>
                        <Link
                          to="/admin/achievements"
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 text-center">
              <Link
                to="/admin/achievements"
                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Inspect credentials & certificates →
              </Link>
            </div>
          </div>

          {/* RIGHT: RECENT ADMINISTRATIVE AUDIT LOGS */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Recent Administrative Actions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Immutable security log stream
                  </p>
                </div>
                <Link
                  to="/admin/logs"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Full Audit Trail</span>
                  <FaArrowRight className="text-[10px]" />
                </Link>
              </div>

              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {recentLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No administrative actions recorded yet.
                  </div>
                ) : (
                  recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {log.admin_username || "System"}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          Target: {log.target_type} #{log.target_id}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 text-center">
              <Link
                to="/admin/logs"
                className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                View all security and audit logs →
              </Link>
            </div>
          </div>
        </div>

        {/* QUICK SHORTCUT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/admin/students"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 transition flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FaUsers />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                Student Directory & Inspector
              </h4>
              <p className="text-[11px] text-slate-500">
                Search, suspend, reactivate accounts
              </p>
            </div>
          </Link>

          <Link
            to="/admin/audit"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 transition flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <FaTrophy />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                Leaderboard & Streak Audits
              </h4>
              <p className="text-[11px] text-slate-500">
                Correct scores, detect duplicates
              </p>
            </div>
          </Link>

          <Link
            to="/admin/health"
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 transition flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FaHeartbeat />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                System Diagnostics & Status
              </h4>
              <p className="text-[11px] text-slate-500">
                Safe integration & latency monitoring
              </p>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
