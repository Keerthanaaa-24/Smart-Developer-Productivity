import { useState, useEffect } from "react";
import { FaShieldAlt, FaTrashAlt, FaCheckCircle, FaExclamationTriangle, FaEye } from "react-icons/fa";
import { getPrivacySettings, updatePrivacySettings, deleteUserAccount } from "../api/settingsApi";

const PrivacySettings = () => {
  const [privacy, setPrivacy] = useState({
    profile_visibility: "public",
    analytics_sharing: true,
    activity_tracking: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const data = await getPrivacySettings();
        if (data) {
          setPrivacy({
            profile_visibility: data.profile_visibility || "public",
            analytics_sharing: Boolean(data.analytics_sharing),
            activity_tracking: Boolean(data.activity_tracking),
          });
        }
      } catch (err) {
        console.warn("Could not load privacy settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrivacy();
  }, []);

  const handleToggle = async (key) => {
    const nextVal = key === "profile_visibility"
      ? (privacy.profile_visibility === "public" ? "private" : "public")
      : !privacy[key];

    const nextPrivacy = { ...privacy, [key]: nextVal };
    setPrivacy(nextPrivacy);
    setSaving(true);
    setFeedback(null);

    try {
      await updatePrivacySettings(nextPrivacy);
      setFeedback({ type: "success", message: "Privacy settings updated successfully!" });
    } catch (err) {
      console.warn("Failed to persist privacy:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim().toLowerCase() !== "delete my account") {
      setDeleteError("Please type 'delete my account' exactly to confirm.");
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteUserAccount(deleteConfirmation.trim());
      // Clean up local credentials and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Failed to delete account. Please try again.";
      setDeleteError(errMsg);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl transition-colors duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Privacy & Data Governance</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Control how your developer telemetry, analytics, and public profile data are shared.
        </p>
      </div>

      {feedback && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0 text-base" />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="space-y-4 max-w-3xl mb-10">
        {/* Profile Visibility */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <FaEye />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Public Developer Profile</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Allow authenticated users to view your public developer achievements and platform connections.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggle("profile_visibility")}
            className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
              privacy.profile_visibility === "public" ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <span
              className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out absolute top-0.5 ${
                privacy.profile_visibility === "public" ? "left-6.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Analytics Sharing */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
              <FaShieldAlt />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Personalized AI Telemetry</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Permit local AI models to analyze coding timestamps to generate personalized productivity insights.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggle("analytics_sharing")}
            className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
              privacy.analytics_sharing ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <span
              className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out absolute top-0.5 ${
                privacy.analytics_sharing ? "left-6.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Activity Tracking */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <FaShieldAlt />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Developer Activity Logging</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Record Pomodoro completions and task milestones in your personal activity telemetry log.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggle("activity_tracking")}
            className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
              privacy.activity_tracking ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <span
              className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out absolute top-0.5 ${
                privacy.activity_tracking ? "left-6.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl p-5 sm:p-6 max-w-3xl">
        <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400 font-bold text-sm mb-1">
          <FaExclamationTriangle />
          <span>Danger Zone: Permanent Account Deletion</span>
        </div>
        <p className="text-xs text-rose-600/90 dark:text-rose-400/80 leading-relaxed mb-4">
          Permanently deletes your user account, tasks, Pomodoro history, developer activity records, and connected platform credentials. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-2"
        >
          <FaTrashAlt />
          <span>Delete Account</span>
        </button>
      </div>

      {/* Explicit Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                <FaExclamationTriangle className="text-xl" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Deletion</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              To confirm permanent deletion of your account and all associated telemetry records, please type:
              <span className="block font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-lg mt-2 text-center border border-rose-200 dark:border-rose-800 select-all">
                delete my account
              </span>
            </p>

            {deleteError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-3">{deleteError}</p>
            )}

            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="delete my account"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-5"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmation.trim().toLowerCase() !== "delete my account"}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition cursor-pointer disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacySettings;