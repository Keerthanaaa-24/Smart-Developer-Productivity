import { useState, useEffect } from "react";
import { FaUser, FaEnvelope, FaPen, FaCheckCircle, FaExclamationCircle, FaUniversity, FaClock, FaIdCard, FaGraduationCap } from "react-icons/fa";
import { getProfileSettings, updateProfileSettings } from "../api/settingsApi";

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST - UTC+05:30)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT - UTC-05:00)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT - UTC-08:00)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT - UTC-06:00)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST - UTC+00:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST - UTC+01:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST - UTC+09:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT - UTC+08:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST - UTC+04:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST - UTC+10:00)" },
];

const ProfileSettings = ({ onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    bio: "",
    timezone: "UTC",
    institution: "",
    department: "",
    batch_year: "",
    student_id_number: "",
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
            timezone: data.timezone || "UTC",
            institution: data.institution || "",
            department: data.department || "",
            batch_year: data.batch_year || "",
            student_id_number: data.student_id_number || "",
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
        timezone: formData.timezone,
        institution: formData.institution,
        department: formData.department,
        batch_year: formData.batch_year,
        student_id_number: formData.student_id_number,
      });

      setFeedback({ type: "success", message: "Profile & academic settings updated successfully!" });
      
      // Sync local storage & navbar
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = {
        ...storedUser,
        username: res.profile.username,
        name: res.profile.full_name || res.profile.username,
        full_name: res.profile.full_name,
        bio: res.profile.bio,
        institution: res.profile.institution,
        department: res.profile.department,
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Developer & Academic Profile</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your public identity, college metadata, graduation cohort, and timezone calibration.
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

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* Core Identity */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FaClock className="text-blue-500" />
              <span>Timezone (Calibration)</span>
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Determines daily streak boundaries and today's activity cutoffs.
            </p>
          </div>
        </div>

        {/* Section: College & Academic Scale */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <FaUniversity className="text-indigo-500" />
            <span>Institutional & College Scale Metadata</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Institution / College Name
              </label>
              <input
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="e.g. Stanford University / IIT"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Department / Major
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Computer Science & Eng."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <FaGraduationCap className="text-emerald-500 text-xs" />
                <span>Graduation Batch / Year</span>
              </label>
              <input
                type="text"
                name="batch_year"
                value={formData.batch_year}
                onChange={handleChange}
                placeholder="e.g. 2026"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <FaIdCard className="text-amber-500 text-xs" />
                <span>Student ID / Roll Number</span>
              </label>
              <input
                type="text"
                name="student_id_number"
                value={formData.student_id_number}
                onChange={handleChange}
                placeholder="e.g. CS2026-042"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Bio / Developer Summary
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows="3"
            placeholder="Tell fellow developers and mentors about your primary tech stack, goals, and projects..."
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
                <span>Saving Profile...</span>
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