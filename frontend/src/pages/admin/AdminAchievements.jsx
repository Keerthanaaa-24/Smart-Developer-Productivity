import { useEffect, useState, useCallback } from "react";
import {
  FaCertificate,
  FaCheck,
  FaTimes,
  FaSearch,
  FaExternalLinkAlt,
  FaFileAlt,
  FaEye,
  FaClock,
  FaInfoCircle,
  FaUser,
} from "react-icons/fa";
import AdminLayout from "../../layouts/AdminLayout";
import API from "../../api/axios";
import {
  getAdminAchievements,
  getAdminAchievementDetails,
  verifyAchievement,
} from "../../api/adminApi";

const AdminAchievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
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

  // Review Modal State
  const [reviewItem, setReviewItem] = useState(null);
  const [notes, setNotes] = useState("");
  const [pointsOverride, setPointsOverride] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminAchievements({
        status_filter: statusFilter,
        search,
        page,
        limit: 15,
      });
      setAchievements(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error("Failed to load achievements queue:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleOpenReview = (item) => {
    setReviewItem(item);
    setNotes(item.verification_notes || "");
    setPointsOverride(item.points_awarded || 15);
    setActionError("");
    setActionSuccess("");
  };

  const handleDecision = async (decisionStatus) => {
    if (
      (decisionStatus === "rejected" || decisionStatus === "correction_requested") &&
      (!notes.trim() || notes.trim().length < 3)
    ) {
      setActionError(
        "Please provide feedback in the auditor notes explaining why this credential was rejected or what correction is needed."
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");
      const payload = {
        status: decisionStatus,
        notes: notes.trim() || undefined,
        points_override:
          decisionStatus === "verified"
            ? parseInt(pointsOverride, 10)
            : undefined,
      };

      const result = await verifyAchievement(reviewItem.id, payload);

      setActionSuccess(
        `Achievement was successfully marked as '${decisionStatus}'.`
      );

      // Update in table
      setAchievements((prev) =>
        prev.map((a) =>
          a.id === reviewItem.id
            ? {
                ...a,
                verification_status: decisionStatus,
                points_awarded: result.points_awarded,
                verification_notes: notes.trim(),
              }
            : a
        )
      );

      setTimeout(() => {
        setReviewItem(null);
      }, 900);
    } catch (err) {
      setActionError(
        err?.response?.data?.detail || "Failed to submit verification decision."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Get token for authenticated certificate preview
  const authToken =
    localStorage.getItem("token") || localStorage.getItem("access_token") || "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Achievement & Credential Verification</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Review uploaded student certificates, verify credentials, and grant transparent bonus points.
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            Queue Records: {totalCount}
          </span>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              type="text"
              placeholder="Search by achievement title, student username, or issuer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <option value="pending">Review Queue (Pending)</option>
              <option value="verified">Verified (Approved)</option>
              <option value="rejected">Rejected</option>
              <option value="correction_requested">Correction Requested</option>
              <option value="all">All Submissions</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Achievement Title</th>
                  <th className="py-3 px-4">Issuer & Category</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Points</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      Loading verification queue...
                    </td>
                  </tr>
                ) : achievements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No achievements found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  achievements.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.username}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {item.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                        {item.title}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold">{item.issuer}</span>
                        <span className="block text-[10px] text-slate-400 uppercase">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {item.certificate_url && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                              <FaFileAlt /> File
                            </span>
                          )}
                          {item.verification_url && (
                            <a
                              href={item.verification_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline font-semibold"
                            >
                              <FaExternalLinkAlt /> Link
                            </a>
                          )}
                          {!item.certificate_url && !item.verification_url && (
                            <span className="text-[10px] text-slate-400">
                              Self Reported
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.verification_status === "verified"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : item.verification_status === "rejected"
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : item.verification_status === "correction_requested"
                              ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {item.verification_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-indigo-600 dark:text-indigo-400">
                        {item.points_awarded} pts
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenReview(item)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                        >
                          Review Credential
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
              Showing page {page} of {Math.max(1, Math.ceil(totalCount / 15))}
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
                disabled={page >= Math.ceil(totalCount / 15)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* REVIEW MODAL */}
        {reviewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setReviewItem(null)}
            />

            <div className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FaCertificate className="text-indigo-600" />
                    <span>Review Achievement Evidence</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student: {reviewItem.username} ({reviewItem.email})
                  </p>
                </div>
                <button
                  onClick={() => setReviewItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="py-4 space-y-4 overflow-y-auto text-xs">
                {/* ACHIEVEMENT DETAILS CARD */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Title
                    </span>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {reviewItem.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Issuer
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {reviewItem.issuer}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Category
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {reviewItem.category}
                      </p>
                    </div>
                  </div>

                  {reviewItem.credential_id && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Credential ID
                      </span>
                      <p className="font-mono text-slate-800 dark:text-slate-200">
                        {reviewItem.credential_id}
                      </p>
                    </div>
                  )}

                  {reviewItem.description && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Description
                      </span>
                      <p className="text-slate-600 dark:text-slate-300">
                        {reviewItem.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* EVIDENCE ACCESS */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-2">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-2">
                    <FaFileAlt />
                    <span>Submitted Verification Evidence</span>
                  </h4>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {reviewItem.certificate_url && (
                      <a
                        href={`${String(API.defaults.baseURL || "").replace(/\/+$/, "")}/achievements/${reviewItem.id}/certificate?token=${encodeURIComponent(authToken)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <FaEye />
                        <span>Inspect Certificate Evidence</span>
                      </a>
                    )}

                    {reviewItem.verification_url && (
                      <a
                        href={reviewItem.verification_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1.5 hover:bg-indigo-50 transition"
                      >
                        <FaExternalLinkAlt />
                        <span>External Credential URL</span>
                      </a>
                    )}

                    {!reviewItem.certificate_url && !reviewItem.verification_url && (
                      <p className="text-slate-500 italic">
                        No external URL or certificate file provided (Self reported).
                      </p>
                    )}
                  </div>
                </div>

                {/* POINTS & NOTES */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Points to Award if Approved
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pointsOverride}
                    onChange={(e) => setPointsOverride(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Default verified certificate points: 15 pts.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Auditor Notes & Feedback (Dispatched to Student) *
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Enter review notes or required corrections..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {actionError && (
                  <p className="text-rose-500 font-semibold">{actionError}</p>
                )}
                {actionSuccess && (
                  <p className="text-emerald-500 font-semibold">{actionSuccess}</p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDecision("rejected")}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-600 hover:text-white transition cursor-pointer border border-rose-200 dark:border-rose-900"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDecision("correction_requested")}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 hover:bg-purple-600 hover:text-white transition cursor-pointer border border-purple-200 dark:border-purple-900"
                  >
                    Request Correction
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDecision("verified")}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition cursor-pointer"
                  >
                    {submitting ? "Processing..." : "Approve & Verify"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAchievements;
