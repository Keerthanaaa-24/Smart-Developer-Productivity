import { useState, useEffect } from "react";
import { FaUser, FaEnvelope, FaPen, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { getProfileSettings, updateProfileSettings } from "../api/settingsApi";

const ProfileSettings = ({ onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfileSettings();
        if (data) {
          setFormData({
            username: data.username || "",
            email: data.email || "",
            full_name: data.full_name || "",
            bio: data.bio || "",
          });
        }
      } catch (err) {
        console.error("Failed to load profile settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await updateProfileSettings({
        username: formData.username,
        full_name: formData.full_name,
        bio: formData.bio,
      });

      setFeedback({ type: "success", message: "Profile updated successfully!" });
      
      // Sync local storage & navbar
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = {
        ...storedUser,
        username: res.profile.username,
        name: res.profile.full_name || res.profile.username,
        full_name: res.profile.full_name,
        bio: res.profile.bio,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("userProfileUpdated"));

      if (onProfileUpdated) {
        onProfileUpdated(res.profile);
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || "Failed to update profile. Please try again.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div className="space-y-4">
          <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl transition-colors duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Developer Profile</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your public identity, display name, and developer biography.
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

      <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Full Name / Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Alex Developer"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="username"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Email Address (Verified)
          </label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
            <span className="absolute right-3.5 top-3.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 rounded">
              Read-only
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Account email is secured and cannot be changed directly for security reasons.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Bio / Developer Summary
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows="4"
            placeholder="Tell fellow developers about your primary stack, interests, and engineering goals..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
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
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <FaPen className="text-xs" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;