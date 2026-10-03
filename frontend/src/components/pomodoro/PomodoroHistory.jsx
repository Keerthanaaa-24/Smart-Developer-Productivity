import { useState } from "react";
import { FaHistory, FaCheckCircle, FaExclamationCircle, FaTasks } from "react-icons/fa";

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const formatDate = (isoString) => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const PomodoroHistory = ({ history = [], loading = false }) => {
  const [filter, setFilter] = useState("all");

  const filteredHistory = history.filter((item) => {
    if (filter === "completed") return item.status === "completed";
    if (filter === "interrupted") return item.status === "interrupted" || item.status === "paused";
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs dark:shadow-xl transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
            <FaHistory />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Session History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Chronological record of completed & logged sessions</p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold gap-1 self-start sm:self-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "completed"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter("interrupted")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filter === "interrupted"
                ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Interrupted
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FaHistory className="text-lg" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No Pomodoro history yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filter === "all"
              ? "Start a focus timer session above to begin logging real productivity records."
              : `No sessions found with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Session Type</th>
                <th className="pb-3">Task Linked</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filteredHistory.map((session) => {
                const isCompleted = session.status === "completed";
                const typeLabel =
                  session.session_type === "focus"
                    ? "Focus Session"
                    : session.session_type === "short_break"
                    ? "Short Break"
                    : "Long Break";

                return (
                  <tr key={session.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            session.session_type === "focus"
                              ? "bg-blue-600"
                              : session.session_type === "short_break"
                              ? "bg-emerald-500"
                              : "bg-purple-600"
                          }`}
                        />
                        <span className="font-semibold text-slate-900 dark:text-white">{typeLabel}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      {session.task_title ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-[11px] max-w-[200px] truncate border border-blue-200/60 dark:border-blue-800/50">
                          <FaTasks className="text-[9px] shrink-0" />
                          <span className="truncate">{session.task_title}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 font-mono text-slate-800 dark:text-slate-200">
                      {formatDuration(session.actual_duration_seconds || session.planned_duration_seconds)}
                    </td>
                    <td className="py-3.5">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                          <FaCheckCircle className="text-[10px]" />
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-full">
                          <FaExclamationCircle className="text-[10px]" />
                          {session.status || "Interrupted"}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-2 text-right text-slate-400 font-mono">
                      {formatDate(session.created_at || session.started_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PomodoroHistory;
