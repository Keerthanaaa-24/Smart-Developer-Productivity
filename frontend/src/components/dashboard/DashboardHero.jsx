import { useMemo } from "react";
import { FaSyncAlt } from "react-icons/fa";

const DashboardHero = ({
  user = {},
  onRefresh,
  refreshing = false,
}) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = user?.username || "Developer";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Command Center
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
          {greeting}, {userName} <span className="inline-block animate-wave">👋</span>
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Here's your live developer telemetry and productivity performance today.
        </p>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-60"
      >
        <FaSyncAlt className={`text-blue-500 dark:text-blue-400 ${refreshing ? "animate-spin" : ""}`} />
        <span>{refreshing ? "Syncing..." : "Sync Telemetry"}</span>
      </button>
    </div>
  );
};

export default DashboardHero;
