import { useState } from "react";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { changePassword } from "../api/settingsApi";

const SecuritySettings = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 6) {
      setFeedback({
        type: "error",
        message: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "New password and confirmation password do not match.",
      });
      return;
    }

    if (newPassword === currentPassword) {
      setFeedback({
        type: "error",
        message: "New password must be different from current password.",
      });
      return;
    }

    setSaving(true);

    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setFeedback({
        type: "success",
        message: "Password changed successfully! Your account is now secured.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errMsg =
        err.response?.data?.detail || "Failed to update password. Please check your current password.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl transition-colors duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account & Security</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your account credentials, password changes, and access security.
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold border ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
          }`}
        >
          {feedback.type === "success" ? (
            <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0 text-base" />
          ) : (
            <FaExclamationCircle className="text-rose-600 dark:text-rose-400 shrink-0 text-base" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              New Password
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Min. 6 characters"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm password"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer py-1"
          >
            {showPasswords ? <FaEyeSlash /> : <FaEye />}
            <span>{showPasswords ? "Hide Passwords" : "Show Passwords"}</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md active:scale-95 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <FaLock className="text-xs" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SecuritySettings;