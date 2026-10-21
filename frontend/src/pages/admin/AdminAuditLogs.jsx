import { useEffect, useState, useCallback } from "react";
import {
  FaHistory,
  FaShieldAlt,
  FaSearch,
  FaFilter,
  FaTimes,
  FaUserShield,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCalendarAlt,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import { getAdminAuditLogs } from "../../api/adminApi";

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Inspect Log Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminAuditLogs({
        action: actionFilter,
        target_type: targetTypeFilter,
        search,
        page,
        limit: 20,
      });
      setLogs(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetTypeFilter, search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeClass = (action) => {
    if (action.includes("SUSPEND") || action.includes("DELETE") || action.includes("REJECT")) {
      return "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
    }
    if (action.includes("VERIFY") || action.includes("REACTIVATE")) {
      return "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    }
    if (action.includes("ADJUST") || action.includes("CORRECTION")) {
      return "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    }
    return "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800";
  };

  const renderParsedDetails = (details) => {
    if (!details) return <span className="text-slate-400 italic">No details</span>;
    try {
      const parsed = JSON.parse(details);
      return (
        <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] overflow-x-auto font-mono">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <p className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs">
          {details}
        </p>
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Security & Administrative Audit Trail</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Immutable ledger of governance actions: score adjustments, account suspensions, and verification decisions.
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            Total Audit Records: {totalCount}
          </span>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search audit trail by administrator, target ID, details..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="USER_SUSPEND">USER_SUSPEND</option>
              <option value="USER_REACTIVATE">USER_REACTIVATE</option>
              <option value="POINTS_ADJUSTMENT">POINTS_ADJUSTMENT</option>
              <option value="POINTS_DELETE_DUPLICATE">POINTS_DELETE_DUPLICATE</option>
              <option value="STREAK_ADJUSTMENT">STREAK_ADJUSTMENT</option>
              <option value="ACHIEVEMENT_VERIFY">ACHIEVEMENT_VERIFY</option>
              <option value="ACHIEVEMENT_REJECT">ACHIEVEMENT_REJECT</option>
              <option value="ACHIEVEMENT_CORRECTION_REQUEST">ACHIEVEMENT_CORRECTION_REQUEST</option>
              <option value="SYSTEM_INIT_SUPERADMIN">SYSTEM_INIT_SUPERADMIN</option>
            </select>

            <select
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Targets</option>
              <option value="user">User</option>
              <option value="point_transaction">Point Transaction</option>
              <option value="streak">Streak</option>
              <option value="achievement">Achievement</option>
            </select>
          </div>
        </div>

        {/* LOGS TABLE */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Affected Student</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No audit events found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {log.admin_username || "System"}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.target_type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          #{log.target_id}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {log.target_user_id ? `User #${log.target_user_id}` : "—"}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {log.ip_address || "127.0.0.1"}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing page {page} of {Math.max(1, Math.ceil(totalCount / 20))}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= Math.ceil(totalCount / 20)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* MODAL INSPECTION */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setSelectedLog(null)}
            />

            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaHistory className="text-indigo-600" />
                  <span>Audit Event #{selectedLog.id}</span>
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="py-4 space-y-4 overflow-y-auto text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      Action
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                      {selectedLog.action}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      Administrator
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                      {selectedLog.admin_username}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      Target Entity
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                      {selectedLog.target_type} #{selectedLog.target_id}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      Timestamp
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 mt-0.5 block">
                      {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 uppercase text-[10px] tracking-wider">
                    Audit Payload & State Details
                  </h4>
                  {renderParsedDetails(selectedLog.details)}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogs;
