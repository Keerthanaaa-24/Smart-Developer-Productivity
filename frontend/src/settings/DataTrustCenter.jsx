import { useState, useEffect, useCallback } from "react";
import {
  getDataTrustCenter,
  syncSinglePlatformActivity,
  syncPlatformActivities,
  exportActivityData,
} from "../api/activityApi";
import {
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSync,
  FaDownload,
  FaExternalLinkAlt,
  FaLock,
  FaInfoCircle,
  FaDatabase,
  FaServer,
  FaEye,
  FaCalendarCheck,
  FaHistory,
} from "react-icons/fa";

const PROVENANCE_BADGES = {
  verified_provider: {
    label: "Verified Provider Data",
    color: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    icon: "✓",
    desc: "Cryptographically authenticated or fetched directly from official platform APIs.",
  },
  app_recorded: {
    label: "Application-Recorded",
    color: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    icon: "⚡",
    desc: "Generated in real-time by internal native engines (Pomodoro Timer, Task Management).",
  },
  user_entered: {
    label: "User-Entered Data",
    color: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    icon: "✎",
    desc: "Logged explicitly by the user (Course completions, Job application milestones).",
  },
  estimated: {
    label: "Estimated Metric",
    color: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    icon: "≈",
    desc: "Calculated from heuristics or statistical productivity regression models.",
  },
};

const DataTrustCenter = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState("");
  const [globalSyncing, setGlobalSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedProviderModal, setSelectedProviderModal] = useState(null);

  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDataTrustCenter();
      setData(res);
    } catch (err) {
      console.error("Failed to load Data Trust Center metrics:", err);
      setToast({
        type: "error",
        message: "Unable to retrieve real-time data trust center status.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const handleSyncProvider = async (providerKey) => {
    try {
      setSyncingProvider(providerKey);
      const res = await syncSinglePlatformActivity(providerKey);
      setToast({
        type: "success",
        message: res.message || `Successfully synchronized ${providerKey}!`,
      });
      await fetchHealthData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.detail || `Failed to sync ${providerKey}.`,
      });
    } finally {
      setSyncingProvider("");
    }
  };

  const handleGlobalSync = async () => {
    try {
      setGlobalSyncing(true);
      const res = await syncPlatformActivities();
      setToast({
        type: "success",
        message: `Ecosystem synchronized! ${res.total_new_activities || 0} new activities recorded.`,
      });
      await fetchHealthData();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.detail || "Full ecosystem sync failed.",
      });
    } finally {
      setGlobalSyncing(false);
    }
  };

  const handleExport = async (format = "json") => {
    try {
      setExporting(true);
      const exportData = await exportActivityData(format);

      if (format === "csv") {
        const url = window.URL.createObjectURL(new Blob([exportData]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `developer_activity_export_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(exportData, null, 2)
        )}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute(
          "download",
          `developer_activity_export_${new Date().toISOString().split("T")[0]}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }

      setToast({
        type: "success",
        message: `Activity telemetry exported successfully (${format.toUpperCase()}).`,
      });
    } catch (err) {
      console.error("Export error:", err);
      setToast({
        type: "error",
        message: "Failed to generate activity export.",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const overall = data?.overall_health || { score: 100, status: "optimal", connected_count: 0, total_providers: 8, total_verified_activities: 0 };
  const provenance = data?.provenance_breakdown || { counts: {}, percentages: {} };
  const providers = data?.providers || [];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* HEADER HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-5 sm:px-8 py-8 sm:py-10">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Transparent Provenance & Zero Mock Data Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Integration Health & Data Trust Center
            </h2>
            <p className="text-slate-300 mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed">
              Inspect exactly what data is collected, where it originates, its synchronization freshness, and download your personal telemetry logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGlobalSync}
              disabled={globalSyncing}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <FaSync className={globalSyncing ? "animate-spin" : ""} />
              <span>{globalSyncing ? "Syncing All..." : "Sync All Providers"}</span>
            </button>
            <button
              onClick={() => handleExport("json")}
              disabled={exporting}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-sm flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <FaDownload />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={exporting}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-sm flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <FaDatabase />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* SUMMARY TILES */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
            <p className="text-[11px] font-medium text-slate-400">Overall Health Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{overall.score}%</span>
              <span className="text-xs text-emerald-400 font-bold uppercase">{overall.status}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
            <p className="text-[11px] font-medium text-slate-400">Active Integrations</p>
            <p className="text-2xl font-black text-white mt-1">
              {overall.connected_count}
              <span className="text-sm font-normal text-slate-400"> / {overall.total_providers}</span>
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
            <p className="text-[11px] font-medium text-slate-400">Stored Activity Records</p>
            <p className="text-2xl font-black text-white mt-1">{overall.total_verified_activities}</p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
            <p className="text-[11px] font-medium text-slate-400">Data Isolation Mode</p>
            <p className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
              <FaLock className="text-[10px]" /> Strict Per-User Isolation
            </p>
          </div>
        </div>
      </div>

      {/* TOAST ALERT */}
      {toast && (
        <div className="mx-5 sm:mx-8 mt-5">
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="px-2 py-1 rounded-md bg-white/50 dark:bg-slate-800 border border-current text-[10px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* BODY CONTENT */}
      <div className="p-5 sm:p-8 space-y-8">
        {/* DATA PROVENANCE BREAKDOWN */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaShieldAlt className="text-blue-600 dark:text-blue-400" />
                Data Provenance Tiers & Telemetry Lineage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every event and metric in your productivity timeline is strictly mapped to one of four verifiable source tiers.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              Total Records: {provenance.total_records || 0}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {Object.entries(PROVENANCE_BADGES).map(([key, meta]) => {
              const count = provenance.counts?.[key] || 0;
              const pct = provenance.percentages?.[key] || 0;

              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-4.5 flex flex-col justify-between transition ${meta.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-black">
                          {meta.icon}
                        </span>
                        {meta.label}
                      </span>
                      <span className="text-xs font-black">{pct}%</span>
                    </div>
                    <p className="text-2xl font-black mt-3">{count}</p>
                    <p className="text-[11px] opacity-80 mt-1 leading-relaxed">{meta.desc}</p>
                  </div>

                  <div className="w-full bg-current/15 h-1.5 rounded-full overflow-hidden mt-4">
                    <div
                      className="bg-current h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PROVIDER HEALTH TABLE / GRID */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaServer className="text-emerald-600 dark:text-emerald-400" />
                Individual Provider Health & Sync Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time API response status, credential validity, and freshness timestamps for all eight integrations.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {providers.map((p) => {
              const isSyncing = syncingProvider === p.key;
              const isConnected = p.connected;
              const freshness = p.freshness || {};

              return (
                <div
                  key={p.key}
                  className="p-5 sm:p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                      {p.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {p.name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isConnected
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : p.connection_status === "Authorization expired"
                              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {p.connection_status}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          {p.sync_badge || p.sync_mode}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {p.username && (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            @{p.username}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FaHistory className="text-[10px]" />
                          Freshness: <strong className="text-slate-700 dark:text-slate-300">{freshness.freshness_label || "Manual"}</strong>
                        </span>
                        <span>
                          Stored Events: <strong className="text-slate-700 dark:text-slate-300">{p.total_events_stored || 0}</strong>
                        </span>
                      </div>

                      {p.last_error && (
                        <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-2 flex items-center gap-2">
                          <FaExclamationTriangle className="shrink-0" />
                          <span>{p.last_error}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => setSelectedProviderModal(p)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FaInfoCircle className="text-[10px]" />
                      <span>Capabilities</span>
                    </button>

                    {p.display_profile_url && (
                      <a
                        href={p.display_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FaExternalLinkAlt className="text-[10px]" />
                        <span>{isConnected ? "View Profile ↗" : "Official Website ↗"}</span>
                      </a>
                    )}

                    {p.supported_actions?.includes("sync") && (
                      <button
                        onClick={() => handleSyncProvider(p.key)}
                        disabled={isSyncing}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      >
                        <FaSync className={isSyncing ? "animate-spin text-[10px]" : "text-[10px]"} />
                        <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* CAPABILITY MODAL */}
      {selectedProviderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedProviderModal.icon}</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {selectedProviderModal.name} Capability Registry
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Integration Architecture & Permission Scopes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProviderModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Supported Telemetry Streams:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                  {selectedProviderModal.supported_data_types?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unsupported Restrictions & Boundaries:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
                  {selectedProviderModal.unsupported_capabilities?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-slate-200">Official Website & Destination:</p>
                <a
                  href={selectedProviderModal.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all mt-0.5 inline-block font-semibold"
                >
                  {selectedProviderModal.website} ↗
                </a>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProviderModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer"
              >
                Close Registry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTrustCenter;
