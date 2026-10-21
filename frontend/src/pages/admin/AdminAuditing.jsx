import { useEffect, useState, useCallback } from "react";
import {
  FaTrophy,
  FaFire,
  FaExclamationTriangle,
  FaTrashAlt,
  FaPlus,
  FaSearch,
  FaCheckCircle,
  FaCalendarAlt,
  FaTimes,
  FaHistory,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import {
  getAdminPointLedger,
  getAdminDuplicatePoints,
  deletePointTransaction,
  adjustStudentPoints,
  getAdminStreakAudit,
  correctStudentStreak,
  getAdminStudents,
} from "../../api/adminApi";

const AdminAuditing = () => {
  const [activeTab, setActiveTab] = useState("points"); // "points" | "streaks"

  // ===========================================================================
  // POINTS LEDGER & DUPLICATES STATE
  // ===========================================================================
  const [transactions, setTransactions] = useState([]);
  const [totalTxs, setTotalTxs] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState("");
  const [txSourceFilter, setTxSourceFilter] = useState("");
  const [loadingTxs, setLoadingTxs] = useState(true);

  // Duplicates Scanner
  const [duplicatesData, setDuplicatesData] = useState(null);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);

  // Modals
  const [deleteTxModal, setDeleteTxModal] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustData, setAdjustData] = useState({
    user_id: "",
    points: 10,
    category: "admin_adjustment",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // ===========================================================================
  // STREAK AUDITING STATE
  // ===========================================================================
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStreakUserId, setSelectedStreakUserId] = useState("");
  const [streakAuditData, setStreakAuditData] = useState(null);
  const [loadingStreak, setLoadingStreak] = useState(false);
  const [correctStreakModalOpen, setCorrectStreakModalOpen] = useState(false);
  const [streakCorrection, setStreakCorrection] = useState({
    target_date: new Date().toISOString().split("T")[0],
    action: "add_login_date",
    reason: "",
  });

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoadingTxs(true);
      const data = await getAdminPointLedger({
        page: txPage,
        limit: 20,
        search: txSearch,
        source_type: txSourceFilter,
      });
      setTransactions(data.items || []);
      setTotalTxs(data.total || 0);
    } catch (err) {
      console.error("Failed to load point ledger:", err);
    } finally {
      setLoadingTxs(false);
    }
  }, [txPage, txSearch, txSourceFilter]);

  // Fetch Duplicates
  const fetchDuplicates = useCallback(async () => {
    try {
      setLoadingDuplicates(true);
      const data = await getAdminDuplicatePoints();
      setDuplicatesData(data);
    } catch (err) {
      console.error("Failed to check duplicate points:", err);
    } finally {
      setLoadingDuplicates(false);
    }
  }, []);

  // Fetch student options for streak picker
  useEffect(() => {
    getAdminStudents({ limit: 50 }).then((res) => {
      setStudentOptions(res.items || []);
      if (res.items && res.items.length > 0 && !selectedStreakUserId) {
        setSelectedStreakUserId(res.items[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "points") {
      fetchTransactions();
      fetchDuplicates();
    }
  }, [activeTab, fetchTransactions, fetchDuplicates]);

  // Load streak audit for selected user
  const fetchStreakAudit = useCallback(async () => {
    if (!selectedStreakUserId) return;
    try {
      setLoadingStreak(true);
      const data = await getAdminStreakAudit(selectedStreakUserId);
      setStreakAuditData(data);
    } catch (err) {
      console.error("Failed to audit streak:", err);
    } finally {
      setLoadingStreak(false);
    }
  }, [selectedStreakUserId]);

  useEffect(() => {
    if (activeTab === "streaks" && selectedStreakUserId) {
      fetchStreakAudit();
    }
  }, [activeTab, selectedStreakUserId, fetchStreakAudit]);

  // Handlers
  const handleDeleteTx = async (e) => {
    e.preventDefault();
    if (!deleteReason.trim() || deleteReason.trim().length < 3) {
      setModalError("Please specify a reason for deletion.");
      return;
    }
    try {
      setSubmitting(true);
      setModalError("");
      await deletePointTransaction(deleteTxModal.id, deleteReason.trim());
      setDeleteTxModal(null);
      setDeleteReason("");
      fetchTransactions();
      fetchDuplicates();
    } catch (err) {
      setModalError(err?.response?.data?.detail || "Failed to delete transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!adjustData.user_id || !adjustData.reason.trim()) {
      setModalError("Please select a student and provide a reason.");
      return;
    }
    try {
      setSubmitting(true);
      setModalError("");
      await adjustStudentPoints({
        user_id: parseInt(adjustData.user_id, 10),
        points: parseInt(adjustData.points, 10),
        category: adjustData.category,
        reason: adjustData.reason.trim(),
      });
      setAdjustModalOpen(false);
      setAdjustData({ user_id: "", points: 10, category: "admin_adjustment", reason: "" });
      fetchTransactions();
    } catch (err) {
      setModalError(err?.response?.data?.detail || "Point adjustment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrectStreak = async (e) => {
    e.preventDefault();
    if (!streakCorrection.reason.trim()) {
      setModalError("Please provide a reason for the streak adjustment.");
      return;
    }
    try {
      setSubmitting(true);
      setModalError("");
      await correctStudentStreak({
        user_id: parseInt(selectedStreakUserId, 10),
        target_date: streakCorrection.target_date,
        action: streakCorrection.action,
        reason: streakCorrection.reason.trim(),
      });
      setCorrectStreakModalOpen(false);
      fetchStreakAudit();
    } catch (err) {
      setModalError(err?.response?.data?.detail || "Streak correction failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Leaderboard & Streak Auditing</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Inspect immutable point ledger, detect and purge duplicate awards, and audit streak logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("points")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === "points"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <FaTrophy />
              <span>Points Ledger & Duplicates</span>
            </button>

            <button
              onClick={() => setActiveTab("streaks")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === "streaks"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              }`}
            >
              <FaFire />
              <span>Streak Auditing</span>
            </button>
          </div>
        </div>

        {/* TAB 1: POINTS LEDGER & DUPLICATE AWARDS */}
        {activeTab === "points" && (
          <div className="space-y-6">
            {/* DUPLICATE AWARDS SCANNER CARD */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
                    <FaExclamationTriangle />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Duplicate Award Scanner
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Scans point transactions for anomalous duplicate awards
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchDuplicates}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Scan Again
                  </button>
                  <button
                    onClick={() => {
                      setAdjustModalOpen(true);
                      setModalError("");
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaPlus className="text-[10px]" />
                    <span>Manual Point Adjustment</span>
                  </button>
                </div>
              </div>

              {loadingDuplicates ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Scanning ledger for duplicate award clusters...
                </div>
              ) : duplicatesData?.duplicates_detected === 0 ? (
                <div className="py-6 flex items-center gap-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <FaCheckCircle className="text-base shrink-0" />
                  <span>
                    Zero duplicate award clusters detected. All point events adhere to idempotency constraints.
                  </span>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {duplicatesData?.groups?.map((grp, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-200/50 dark:border-rose-900/50">
                        <div>
                          <span className="font-bold text-rose-900 dark:text-rose-200">
                            Student: {grp.username} (ID #{grp.user_id})
                          </span>
                          <span className="text-slate-500 ml-2">
                            Source: {grp.source_type} ({grp.source_id}) • {grp.occurrences} records
                          </span>
                        </div>
                        <span className="font-black text-rose-600 dark:text-rose-400">
                          Total Awarded: {grp.total_points_awarded} pts
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        {grp.transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-rose-200/40 dark:border-rose-900/40"
                          >
                            <span className="text-slate-700 dark:text-slate-300">
                              Tx #{tx.id} • {tx.points} pts • {tx.description} ({tx.created_at})
                            </span>
                            <button
                              onClick={() => {
                                setDeleteTxModal(tx);
                                setDeleteReason("Duplicate award cleanup");
                                setModalError("");
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 transition"
                            >
                              Purge Record
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LEDGER FILTER & SEARCH */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search ledger by username, source ID, description..."
                  value={txSearch}
                  onChange={(e) => {
                    setTxSearch(e.target.value);
                    setTxPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={txSourceFilter}
                onChange={(e) => {
                  setTxSourceFilter(e.target.value);
                  setTxPage(1);
                }}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Source Types</option>
                <option value="task">Tasks</option>
                <option value="pomodoro">Pomodoro Sessions</option>
                <option value="achievement">Achievements</option>
                <option value="project">Projects</option>
                <option value="admin_adjustment">Admin Adjustments</option>
              </select>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Tx ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Source & ID</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Points</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {loadingTxs ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400">
                          Loading point ledger...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-slate-400">
                          No point transactions found.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            #{tx.id}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {tx.username}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {tx.source_type}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {tx.source_id}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="py-3 px-4 text-right font-black">
                            <span
                              className={
                                tx.points > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {tx.points > 0 ? `+${tx.points}` : tx.points}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ""}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setDeleteTxModal(tx);
                                setDeleteReason("");
                                setModalError("");
                              }}
                              title="Delete Transaction"
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <FaTrashAlt />
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
                  Showing page {txPage} of {Math.max(1, Math.ceil(totalTxs / 20))}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                  >
                    Previous
                  </button>
                  <button
                    disabled={txPage >= Math.ceil(totalTxs / 20)}
                    onClick={() => setTxPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STREAK AUDITING */}
        {activeTab === "streaks" && (
          <div className="space-y-6">
            {/* STUDENT SELECTOR */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Student to Audit:
                </label>
                <select
                  value={selectedStreakUserId}
                  onChange={(e) => setSelectedStreakUserId(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none"
                >
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.username} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setCorrectStreakModalOpen(true);
                  setModalError("");
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <FaCalendarAlt />
                <span>Adjust / Correct Streak Date</span>
              </button>
            </div>

            {loadingStreak ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading streak audit telemetry...
              </div>
            ) : streakAuditData ? (
              <>
                {/* STREAK SUMMARY CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Current Streak
                    </span>
                    <p className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1.5">
                      <FaFire />
                      <span>{streakAuditData.streak_summary.current_streak} days</span>
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Longest Streak
                    </span>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
                      <FaTrophy />
                      <span>{streakAuditData.streak_summary.longest_streak} days</span>
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Total Active Days
                    </span>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {streakAuditData.streak_summary.total_login_days}
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Last Recorded Date
                    </span>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-2">
                      {streakAuditData.streak_summary.last_login_date || "None"}
                    </p>
                  </div>
                </div>

                {/* LOGIN HISTORY TABLE */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Login Telemetry History ({streakAuditData.history.length} records)
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Login Date</th>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Client IP</th>
                          <th className="py-3 px-4">User Agent / Origin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {streakAuditData.history.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-slate-400">
                              No login history entries found for this student.
                            </td>
                          </tr>
                        ) : (
                          streakAuditData.history.map((h) => (
                            <tr key={h.id}>
                              <td className="py-2.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                                {h.login_date}
                              </td>
                              <td className="py-2.5 px-4 text-slate-400">
                                {h.login_time ? new Date(h.login_time).toLocaleString() : ""}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-[11px]">
                                {h.ip_address || "127.0.0.1"}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">
                                {h.user_agent || "Browser Session"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* MODAL: DELETE TRANSACTION */}
        {deleteTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setDeleteTxModal(null)}
            />
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                Purge Point Transaction #{deleteTxModal.id}
              </h3>
              <form onSubmit={handleDeleteTx} className="mt-4 space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  You are deleting: {deleteTxModal.points} pts ({deleteTxModal.description}).
                  This action is permanent and will be logged in the immutable security trail.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Auditing Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Duplicate award from network race condition"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {modalError && (
                  <p className="text-rose-500 font-semibold">{modalError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTxModal(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    {submitting ? "Purging..." : "Confirm Deletion"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: MANUAL POINT ADJUSTMENT */}
        {adjustModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setAdjustModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                Manual Score Adjustment
              </h3>
              <form onSubmit={handleAdjustPoints} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Student *
                  </label>
                  <select
                    required
                    value={adjustData.user_id}
                    onChange={(e) => setAdjustData({ ...adjustData, user_id: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">Select student...</option>
                    {studentOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.username} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Points (Use negative to debit) *
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustData.points}
                    onChange={(e) => setAdjustData({ ...adjustData, points: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Justification & Recorded Reason *
                  </label>
                  <textarea
                    rows="2"
                    required
                    placeholder="Provide justification for score correction..."
                    value={adjustData.reason}
                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {modalError && (
                  <p className="text-rose-500 font-semibold">{modalError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {submitting ? "Applying..." : "Apply Adjustment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: STREAK CORRECTION */}
        {correctStreakModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setCorrectStreakModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                Correct Student Streak Date
              </h3>
              <form onSubmit={handleCorrectStreak} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Action *
                  </label>
                  <select
                    value={streakCorrection.action}
                    onChange={(e) => setStreakCorrection({ ...streakCorrection, action: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="add_login_date">Add Missed Login Date</option>
                    <option value="remove_login_date">Remove Inaccurate Login Date</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={streakCorrection.target_date}
                    onChange={(e) => setStreakCorrection({ ...streakCorrection, target_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason & Audit Justification *
                  </label>
                  <textarea
                    rows="2"
                    required
                    placeholder="State reason for streak adjustment..."
                    value={streakCorrection.reason}
                    onChange={(e) => setStreakCorrection({ ...streakCorrection, reason: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {modalError && (
                  <p className="text-rose-500 font-semibold">{modalError}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCorrectStreakModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {submitting ? "Updating..." : "Confirm Streak Correction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditing;
