import { useEffect, useState, useCallback } from "react";
import {
  FaHeartbeat,
  FaDatabase,
  FaServer,
  FaGithub,
  FaAws,
  FaCode,
  FaGraduationCap,
  FaCheckCircle,
  FaExclamationCircle,
  FaSync,
  FaLock,
  FaBolt,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import { getAdminHealthOverview } from "../../api/adminApi";

const AdminHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false); // default OFF to conserve Render free-tier resources

  const fetchHealth = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await getAdminHealthOverview();
      setHealthData(data);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Health check failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Opt-in background refresh (120s slow check) only when explicitly enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 120000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const getIntegrationIcon = (key) => {
    switch (key) {
      case "github_oauth":
        return <FaGithub className="text-lg" />;
      case "s3_storage":
        return <FaAws className="text-lg text-amber-500" />;
      case "leetcode_sync":
        return <FaCode className="text-lg text-amber-600" />;
      default:
        return <FaGraduationCap className="text-lg text-blue-500" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Platform Health & Integrations</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live database connection telemetry, external service configuration, and latency metrics without secret exposure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>Auto-refresh (2m)</span>
            </label>
            <span className="text-xs text-slate-400">
              Last check: {lastCheckTime || "Just now"}
            </span>
            <button
              onClick={fetchHealth}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 transition cursor-pointer"
            >
              <FaSync className={refreshing ? "animate-spin" : ""} />
              <span>Ping Now</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Pinging platform systems and verifying database health...
          </div>
        ) : healthData ? (
          <>
            {/* CORE STATUS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* API Liveness */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    API Process Liveness
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <FaServer />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                      {healthData.api_status}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    FastAPI ASGI runtime running cleanly
                  </p>
                </div>
              </div>

              {/* Database Connection */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Database Connection
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                    <FaDatabase />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        healthData.database.status === "operational"
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                      {healthData.database.status}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Ping Latency:{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {healthData.database.latency_ms} ms
                    </span>{" "}
                    • Engine: {healthData.database.engine}
                  </p>
                </div>
              </div>

              {/* Render Optimization */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Cloud Tier Efficiency
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                    <FaBolt />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Render Free Tier Safe
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Lightweight pool (size {healthData.database.pool?.pool_size || 3}), no busyworkers
                  </p>
                </div>
              </div>
            </div>

            {/* INTEGRATIONS MONITORING */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <FaLock className="text-indigo-600" />
                    <span>External Services & Credentials Health</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live readiness check without exposing private client secrets or API keys
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                  Zero Secrets Leaked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {Object.entries(healthData.integrations || {}).map(([key, item]) => (
                  <div
                    key={key}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        {getIntegrationIcon(key)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Mode: {item.mode}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Configured: {item.is_configured ? "Yes (Protected)" : "No (Disabled)"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status === "operational"
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : item.status === "local_filesystem"
                          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* DIAGNOSTIC DETAILS */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Connection Pool Telemetry
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Pool Size</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {healthData.database.pool?.pool_size ?? 3}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Checked In</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {healthData.database.pool?.checked_in ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Checked Out</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {healthData.database.pool?.checked_out ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sync Events (24h)</span>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {healthData.sync_activity_24h}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminHealth;
