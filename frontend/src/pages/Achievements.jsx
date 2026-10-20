import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "../layouts/MainLayout";
import achievementApi from "../api/achievementApi";
import {
  FaAward,
  FaPlus,
  FaExternalLinkAlt,
  FaFilePdf,
  FaImage,
  FaTrash,
  FaEdit,
  FaCheckCircle,
  FaTimes,
  FaLock,
  FaGlobe,
  FaUpload,
  FaSyncAlt,
  FaCertificate,
  FaInfoCircle,
} from "react-icons/fa";

const CATEGORIES = [
  { id: "", label: "All Categories" },
  { id: "hackathon", label: "Hackathons" },
  { id: "certification", label: "Certifications" },
  { id: "competitive_programming", label: "Competitive Coding" },
  { id: "course", label: "Courses" },
  { id: "project", label: "Projects" },
  { id: "other", label: "Other" },
];

const STATUS_BADGES = {
  self_reported: {
    label: "Self-Reported",
    color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
  link_supplied: {
    label: "Link Supplied",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  evidence_uploaded: {
    label: "Evidence Uploaded",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  verified: {
    label: "Verified",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    label: "Needs Review",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "certification",
    issuer: "",
    description: "",
    issue_date: "",
    credential_id: "",
    verification_url: "",
    is_public: true,
  });

  const fetchAchievements = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await achievementApi.getMyAchievements(categoryFilter);
      setAchievements(data);
    } catch (err) {
      console.error("Failed to fetch achievements:", err);
      setError("Unable to load achievements. Please check your network connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      category: "certification",
      issuer: "",
      description: "",
      issue_date: "",
      credential_id: "",
      verification_url: "",
      is_public: true,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (ach) => {
    setEditingItem(ach);
    setFormData({
      title: ach.title || "",
      category: ach.category || "certification",
      issuer: ach.issuer || "",
      description: ach.description || "",
      issue_date: ach.issue_date || "",
      credential_id: ach.credential_id || "",
      verification_url: ach.verification_url || "",
      is_public: ach.is_public ?? true,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.issuer.trim()) {
      alert("Please provide both a Title and an Issuer.");
      return;
    }

    try {
      if (editingItem) {
        await achievementApi.updateAchievement(editingItem.id, formData);
        setStatusMessage("Achievement updated successfully!");
      } else {
        await achievementApi.createAchievement(formData);
        setStatusMessage("Achievement recorded! Points awarded.");
      }
      setModalOpen(false);
      fetchAchievements();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save achievement. Please verify all fields.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this achievement?")) return;
    try {
      await achievementApi.deleteAchievement(id);
      setAchievements((prev) => prev.filter((a) => a.id !== id));
      setStatusMessage("Achievement deleted.");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Unable to delete achievement.");
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTargetId || !uploadFile) return;

    setUploading(true);
    try {
      const res = await achievementApi.uploadCertificate(uploadTargetId, uploadFile);
      setStatusMessage(res.message || "Certificate evidence uploaded!");
      setUploadTargetId(null);
      setUploadFile(null);
      fetchAchievements();
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.response?.data?.detail || "Failed to upload file. Must be PDF, PNG, JPG under 5 MB.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-7 pb-16 max-w-7xl mx-auto">
        {/* =========================================================
            HEADER & ACTIONS
        ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <FaCertificate className="text-purple-500" />
                Student Portfolio & Credentials
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Audited & Privacy-Controlled
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 flex items-center gap-3">
              Achievements & Certificates
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Track your hackathon victories, coding accolades (HackerRank, LeetCode), professional certificates (Coursera, NPTEL), and project credentials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAchievements(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              <FaSyncAlt className={`text-blue-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <FaPlus />
              <span>Add Achievement</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <FaCheckCircle />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* =========================================================
            CATEGORY FILTERS
        ========================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-4 py-2 rounded-2xl transition whitespace-nowrap cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* =========================================================
            ACHIEVEMENTS GRID
        ========================================================= */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 bg-slate-100 dark:bg-slate-800/60 rounded-3xl animate-pulse"
              />
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-2xl">
              <FaAward />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Achievements Recorded Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Add your certifications, hackathon prizes, or coding platform profiles to earn bonus points and show off your credentials!
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
            >
              <FaPlus /> Add Your First Achievement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {achievements.map((ach) => {
              const statusBadge = STATUS_BADGES[ach.verification_status] || STATUS_BADGES.self_reported;
              return (
                <div
                  key={ach.id}
                  className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md transition duration-200"
                >
                  <div>
                    {/* Header: Issuer & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {ach.issuer}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 leading-snug line-clamp-2">
                      {ach.title}
                    </h3>

                    {ach.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                        {ach.description}
                      </p>
                    )}

                    {/* Metadata details */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[11px]">
                      {ach.issue_date && (
                        <p className="text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Issued:</span>{" "}
                          {ach.issue_date}
                        </p>
                      )}
                      {ach.credential_id && (
                        <p className="text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">ID:</span>{" "}
                          {ach.credential_id}
                        </p>
                      )}
                      <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Visibility:</span>{" "}
                        {ach.is_public ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                            <FaGlobe /> Public Portfolio
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1 font-bold">
                            <FaLock /> Private
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Proof Links */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ach.verification_url && (
                        <a
                          href={ach.verification_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition text-xs"
                          title="Open Verification Link"
                        >
                          <FaExternalLinkAlt />
                        </a>
                      )}
                      {ach.certificate_url ? (
                        <a
                          href={achievementApi.getCertificateUrl(ach)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition text-xs"
                          title="View Certificate Evidence"
                        >
                          <FaCertificate />
                        </a>
                      ) : (
                        <button
                          onClick={() => setUploadTargetId(ach.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-500 text-[11px] font-bold transition cursor-pointer"
                          title="Upload Certificate File"
                        >
                          <FaUpload className="text-[10px]" /> Add PDF/Image
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(ach)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Edit Achievement"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(ach.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Delete Achievement"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================
            ADD / EDIT MODAL
        ========================================================= */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingItem ? "Edit Achievement" : "Add Student Achievement"}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1st Place - Smart India Hackathon"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="hackathon">Hackathon</option>
                      <option value="certification">Certification</option>
                      <option value="competitive_programming">Competitive Coding</option>
                      <option value="course">Course Completion</option>
                      <option value="project">Project Milestone</option>
                      <option value="other">Other Accomplishment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Issuer / Platform *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HackerRank, Coursera, NPTEL"
                      value={formData.issuer}
                      onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Credential ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CERT-98214"
                      value={formData.credential_id}
                      onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verification URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.coursera.org/verify/... or https://hackerrank.com/certificates/..."
                    value={formData.verification_url}
                    onChange={(e) => setFormData({ ...formData, verification_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Supplying a verifiable link upgrades verification status to "Link Supplied".
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description / Key Accomplishment
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the challenge solved, project built, or rank attained..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_public_check"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_public_check" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Show on Public Portfolio
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-sm"
                  >
                    {editingItem ? "Save Changes" : "Create Achievement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            UPLOAD CERTIFICATE EVIDENCE MODAL
        ========================================================= */}
        {uploadTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Upload Certificate File
                </h3>
                <button
                  onClick={() => setUploadTargetId(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Choose PDF or Image (&le; 5 MB)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => setUploadFile(e.target.files[0] || null)}
                    className="w-full text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-slate-300 hover:file:bg-blue-100 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Supported formats: PDF certificates, PNG, JPG, WebP. Verified through secure file scanning.
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUploadTargetId(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile || uploading}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {uploading && <FaSyncAlt className="animate-spin text-xs" />}
                    <span>{uploading ? "Uploading..." : "Upload Evidence"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Achievements;
