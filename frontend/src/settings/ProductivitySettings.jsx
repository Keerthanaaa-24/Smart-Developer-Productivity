import { useState, useEffect } from "react";
import { FaBullseye, FaStopwatch, FaCheckCircle, FaSave, FaRedo } from "react-icons/fa";
import { getProductivitySettings, updateProductivitySettings } from "../api/settingsApi";

const ProductivitySettings = ({ onSettingsUpdated }) => {
  const [formData, setFormData] = useState({
    daily_coding_target_hours: 2.0,
    daily_learning_target_hours: 1.0,
    daily_focus_target_minutes: 120,
    daily_task_target: 5,
    pomodoro_focus_duration: 25,
    pomodoro_short_break: 5,
    pomodoro_long_break: 15,
    pomodoro_cycle_count: 4,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchProductivity = async () => {
      try {
        const data = await getProductivitySettings();
        if (data) {
          setFormData({
            daily_coding_target_hours: data.daily_coding_target_hours || 2.0,
            daily_learning_target_hours: data.daily_learning_target_hours || 1.0,
            daily_focus_target_minutes: data.daily_focus_target_minutes || 120,
            daily_task_target: data.daily_task_target || 5,
            pomodoro_focus_duration: data.pomodoro_focus_duration || 25,
            pomodoro_short_break: data.pomodoro_short_break || 5,
            pomodoro_long_break: data.pomodoro_long_break || 15,
            pomodoro_cycle_count: data.pomodoro_cycle_count || 4,
          });
        }
      } catch (err) {
        console.warn("Could not load productivity settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductivity();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await updateProductivitySettings(formData);
      setFeedback({
        type: "success",
        message: "Productivity targets and Pomodoro durations saved successfully!",
      });
      if (onSettingsUpdated) {
        onSettingsUpdated(res.productivity);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: "Failed to save productivity settings. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setFormData({
      daily_coding_target_hours: 2.0,
      daily_learning_target_hours: 1.0,
      daily_focus_target_minutes: 120,
      daily_task_target: 5,
      pomodoro_focus_duration: 25,
      pomodoro_short_break: 5,
      pomodoro_long_break: 15,
      pomodoro_cycle_count: 4,
    });
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl transition-colors duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Productivity & Focus Targets</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Define your daily output targets, sprint intervals, and Pomodoro cadence.
        </p>
      </div>

      {feedback && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0 text-base" />
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
        {/* Section 1: Daily Targets */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <FaBullseye className="text-blue-600 dark:text-blue-400" />
            <span>Daily Output Goals</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Daily Coding Target:</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                  {formData.daily_coding_target_hours} hrs
                </span>
              </label>
              <input
                type="range"
                name="daily_coding_target_hours"
                min="0.5"
                max="8.0"
                step="0.5"
                value={formData.daily_coding_target_hours}
                onChange={handleChange}
                className="w-full accent-blue-600 cursor-pointer mt-2"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Recommended for developers: 2–4 hours</p>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Daily Learning & Theory:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                  {formData.daily_learning_target_hours} hrs
                </span>
              </label>
              <input
                type="range"
                name="daily_learning_target_hours"
                min="0.5"
                max="6.0"
                step="0.5"
                value={formData.daily_learning_target_hours}
                onChange={handleChange}
                className="w-full accent-indigo-600 cursor-pointer mt-2"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Courses, quizzes & problem solving</p>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Daily Focus Goal (Pomodoro):</span>
                <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">
                  {Math.floor(formData.daily_focus_target_minutes / 60)}h{" "}
                  {formData.daily_focus_target_minutes % 60}m
                </span>
              </label>
              <input
                type="range"
                name="daily_focus_target_minutes"
                min="30"
                max="360"
                step="15"
                value={formData.daily_focus_target_minutes}
                onChange={handleChange}
                className="w-full accent-purple-600 cursor-pointer mt-2"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Deep work time without context switching</p>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Daily Tasks Target:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {formData.daily_task_target} tasks
                </span>
              </label>
              <input
                type="range"
                name="daily_task_target"
                min="1"
                max="15"
                step="1"
                value={formData.daily_task_target}
                onChange={handleChange}
                className="w-full accent-emerald-600 cursor-pointer mt-2"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Target task completions per day</p>
            </div>
          </div>
        </div>

        {/* Section 2: Pomodoro Cadence & Durations */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <FaStopwatch className="text-indigo-600 dark:text-indigo-400" />
            <span>Pomodoro Interval Durations</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Focus Sprint
              </label>
              <select
                name="pomodoro_focus_duration"
                value={formData.pomodoro_focus_duration}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="25">25 minutes (Standard)</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="50">50 minutes (Extended)</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Short Break
              </label>
              <select
                name="pomodoro_short_break"
                value={formData.pomodoro_short_break}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3">3 minutes</option>
                <option value="5">5 minutes (Standard)</option>
                <option value="10">10 minutes</option>
              </select>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Long Break
              </label>
              <select
                name="pomodoro_long_break"
                value={formData.pomodoro_long_break}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10 minutes</option>
                <option value="15">15 minutes (Standard)</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cycle Length
              </label>
              <select
                name="pomodoro_cycle_count"
                value={formData.pomodoro_cycle_count}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2">2 sessions</option>
                <option value="3">3 sessions</option>
                <option value="4">4 sessions (Standard)</option>
                <option value="6">6 sessions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md active:scale-95 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <FaSave className="text-xs" />
                <span>Save Productivity Preferences</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs px-4 py-3 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <FaRedo className="text-[10px]" />
            <span>Reset to Standard</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductivitySettings;
