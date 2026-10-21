import { useEffect, useState, useCallback } from "react";
import {
  FaSearch,
  FaUserCheck,
  FaUserSlash,
  FaEye,
  FaShieldAlt,
  FaExclamationTriangle,
  FaTimes,
  FaTrophy,
  FaTasks,
  FaClock,
  FaAward,
  FaHistory,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminStudents,
  getAdminStudentDetails,
  updateStudentStatus,
} from "../../api/adminApi";

const AdminStudents = () => {
  const { user: currentAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Debounce search input by 300ms to eliminate redundant network requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Inspection Drawer
  const [inspectingUser, setInspectingUser] = useState(null);
  const [inspectionData, setInspectionData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Status Modal
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [statusReason, setStatusReason] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminStudents({
        search,
        status_filter: statusFilter,
        role_filter: roleFilter,
        page,
        limit: 15,
      });
      setStudents(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, roleFilter, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenInspect = async (student) => {
    setInspectingUser(student);
    try {
      setLoadingDetails(true);
      const data = await getAdminStudentDetails(student.id);
      setInspectionData(data);
    } catch (err) {
      console.error("Failed to fetch student details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenStatusModal = (student) => {
    setStatusModalUser(student);
    setStatusReason("");
    setActionError("");
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!statusReason.trim() || statusReason.trim().length < 3) {
      setActionError("Please provide a reason (at least 3 characters).");
      return;
    }

    try {
      setSubmittingStatus(true);
      setActionError("");
      const targetActive = !statusModalUser.is_active;
      await updateStudentStatus(statusModalUser.id, {
        is_active: targetActive,
        reason: statusReason.trim(),
      });

      // Update in local state
      setStudents((prev) =>
        prev.map((s) =>
          s.id === statusModalUser.id
            ? { ...s, is_active: targetActive, suspension_reason: targetActive ? null : statusReason.trim() }
            : s
        )
      );

      if (inspectionData && inspectionData.student.id === statusModalUser.id) {
        setInspectionData((prev) => ({
          ...prev,
          student: {
            ...prev.student,
            is_active: targetActive,
            suspension_reason: targetActive ? null : statusReason.trim(),
          },
        }));
      }

      setStatusModalUser(null);
    } catch (err) {
      console.error("Failed to update status:", err);
      setActionError(err?.response?.data?.detail || "Action failed.");
    } finally {
      setSubmittingStatus(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Student Directory & Account Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Search registered students, inspect genuine activity telemetry, and manage authorization status.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            Total Registered: {totalCount}
          </span>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search by student username or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Status: All</option>
              <option value="active">Active Accounts</option>
              <option value="suspended">Suspended Accounts</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Role: All</option>
              <option value="student">Students Only</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>

        {/* STUDENTS TABLE */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-right">Points</th>
                  <th className="py-3.5 px-4 text-center">Tasks</th>
                  <th className="py-3.5 px-4 text-center">Achievements</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      Loading student directory...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No registered students found matching your query.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {student.username}
                              </p>
                              {currentAdmin?.id === student.id && (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            student.role === "superadmin"
                              ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                              : student.role === "admin"
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {student.role || "student"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {student.total_points ?? 0}
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium">
                        {student.completed_tasks ?? 0}
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium">
                        {student.achievements_count ?? 0}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {student.last_login_date || "Never"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            student.is_active
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.is_active ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {student.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenInspect(student)}
                            title="Inspect Student Telemetry"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <FaEye />
                          </button>

                          {currentAdmin?.id === student.id ? (
                            <button
                              type="button"
                              disabled
                              title="You cannot suspend or modify your own administrative account"
                              className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50"
                            >
                              <FaUserSlash />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(student)}
                              title={student.is_active ? "Suspend Student" : "Reactivate Student"}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                student.is_active
                                  ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              }`}
                            >
                              {student.is_active ? <FaUserSlash /> : <FaUserCheck />}
                            </button>
                          )}
                        </div>
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
              Showing page {page} of {Math.max(1, Math.ceil(totalCount / 15))}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= Math.ceil(totalCount / 15)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* INSPECTION SLIDE-OVER MODAL */}
        {inspectingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setInspectingUser(null)}
            />

            <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Student Telemetry Inspector</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      ID #{inspectingUser.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {inspectingUser.username} ({inspectingUser.email})
                  </p>
                </div>
                <button
                  onClick={() => setInspectingUser(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {loadingDetails ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Loading student telemetry...
                  </div>
                ) : inspectionData ? (
                  <>
                    {/* STATS OVERVIEW */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Points
                        </span>
                        <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
                          {inspectionData.metrics.total_points}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Streak (Days)
                        </span>
                        <p className="text-lg font-black text-amber-500 mt-1">
                          {inspectionData.streak.current_streak} / {inspectionData.streak.longest_streak}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Tasks Done
                        </span>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          {inspectionData.metrics.completed_tasks}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Focus Hours
                        </span>
                        <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
                          {Math.round((inspectionData.metrics.focus_minutes / 60) * 10) / 10}h
                        </p>
                      </div>
                    </div>

                    {/* STATUS BANNER */}
                    <div
                      className={`p-4 rounded-2xl border ${
                        inspectionData.student.is_active
                          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                          : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              inspectionData.student.is_active
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Account Status: {inspectionData.student.is_active ? "Active" : "Suspended"}
                          </span>
                        </div>
                        {currentAdmin?.id === inspectionData.student.id ? (
                          <span className="text-[11px] font-semibold text-slate-400 italic">
                            (Your Account)
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setInspectingUser(null);
                              handleOpenStatusModal(inspectionData.student);
                            }}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Change Status
                          </button>
                        )}
                      </div>
                      {!inspectionData.student.is_active && (
                        <p className="text-xs text-rose-700 dark:text-rose-300 mt-2">
                          Reason: {inspectionData.student.suspension_reason || "None recorded"}
                        </p>
                      )}
                    </div>

                    {/* ACHIEVEMENTS */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                        Registered Achievements ({inspectionData.achievements.length})
                      </h4>
                      {inspectionData.achievements.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">
                          No achievements uploaded yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {inspectionData.achievements.map((ach) => (
                            <div
                              key={ach.id}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {ach.title}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {ach.issuer} • {ach.category}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {ach.verification_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RECENT TRANSACTIONS */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                        Recent Point Transactions
                      </h4>
                      {inspectionData.recent_transactions.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">
                          No point transactions recorded.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {inspectionData.recent_transactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {tx.description || tx.source_type}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ""}
                                </span>
                              </div>
                              <span className="font-black text-indigo-600 dark:text-indigo-400">
                                {tx.points > 0 ? `+${tx.points}` : tx.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* STATUS CHANGE CONFIRMATION MODAL */}
        {statusModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setStatusModalUser(null)}
            />

            <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaShieldAlt className={statusModalUser.is_active ? "text-rose-500" : "text-emerald-500"} />
                  <span>
                    {statusModalUser.is_active ? "Suspend Student Account" : "Reactivate Student Account"}
                  </span>
                </h3>
                <button
                  onClick={() => setStatusModalUser(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleConfirmStatusChange} className="mt-4 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  You are about to {statusModalUser.is_active ? "suspend" : "reactivate"} the account for{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {statusModalUser.username}
                  </span>{" "}
                  ({statusModalUser.email}).
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Administrative Reason & Audit Justification *
                  </label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Enter reason for this authorization change (will be recorded in audit log)..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {actionError && (
                  <p className="text-xs text-rose-500 font-semibold">{actionError}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatusModalUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStatus}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-md ${
                      statusModalUser.is_active
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                    }`}
                  >
                    {submittingStatus
                      ? "Recording..."
                      : statusModalUser.is_active
                      ? "Confirm Suspension"
                      : "Confirm Reactivation"}
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

export default AdminStudents;
