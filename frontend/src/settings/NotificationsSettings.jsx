import { useState, useEffect } from "react";
import { FaBell, FaVolumeUp, FaCheckCircle, FaCalendarCheck, FaTasks } from "react-icons/fa";
import { getNotificationSettings, updateNotificationSettings } from "../api/settingsApi";

const NotificationsSettings = () => {
  const [prefs, setPrefs] = useState({
    pomodoro_notifications: true,
    productivity_reminders: true,
    daily_summary: true,
    activity_notifications: true,
    sound_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotificationSettings();
        if (data) {
          setPrefs({
            pomodoro_notifications: Boolean(data.pomodoro_notifications),
            productivity_reminders: Boolean(data.productivity_reminders),
            daily_summary: Boolean(data.daily_summary),
            activity_notifications: Boolean(data.activity_notifications),
            sound_enabled: Boolean(data.sound_enabled),
          });
        }
      } catch (err) {
        console.warn("Could not load notification preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleToggle = async (key) => {
    const nextVal = !prefs[key];
    const nextPrefs = { ...prefs, [key]: nextVal };
    setPrefs(nextPrefs);
    setSaving(true);
    setFeedback(null);

    // If user enabled browser notifications, request permission interactively
    if (nextVal && (key === "pomodoro_notifications" || key === "productivity_reminders")) {
      if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.warn("Notification request permission error:", e);
        }
      }
    }

    try {
      await updateNotificationSettings(nextPrefs);
      setFeedback({ type: "success", message: "Notification preferences saved!" });
    } catch (err) {
      console.warn("Failed to persist notifications:", err);
    } finally {
      setSaving(false);
    }
  };

  const notificationList = [
    {
      key: "pomodoro_notifications",
      title: "Pomodoro Completion Alerts",
      description: "Trigger chime and browser notification when a focus sprint or break completes.",
      icon: <FaBell className="text-blue-600 dark:text-blue-400" />,
    },
    {
      key: "sound_enabled",
      title: "Completion Audio Synthesis",
      description: "Play melodic audio chimes upon completing focus intervals.",
      icon: <FaVolumeUp className="text-indigo-600 dark:text-indigo-400" />,
    },
    {
      key: "productivity_reminders",
      title: "Productivity Coaching Reminders",
      description: "Receive contextual AI coaching suggestions when streaks or goals are at risk.",
      icon: <FaCalendarCheck className="text-emerald-600 dark:text-emerald-400" />,
    },
    {
      key: "daily_summary",
      title: "Daily Focus Goal Summary",
      description: "Get notified when you reach your configured daily focus and coding targets.",
      icon: <FaTasks className="text-purple-600 dark:text-purple-400" />,
    },
    {
      key: "activity_notifications",
      title: "Platform Activity Sync Alerts",
      description: "Receive brief confirmations when new GitHub commits or learning achievements sync.",
      icon: <FaBell className="text-amber-600 dark:text-amber-400" />,
    },
  ];

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl transition-colors duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Choose which notifications and audio cues you want to receive across your workflow.
        </p>
      </div>

      {feedback && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0 text-base" />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="space-y-4 max-w-3xl">
        {notificationList.map((item) => {
          const isEnabled = prefs[item.key];
          return (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(item.key)}
                className={`relative w-12 h-6.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                  isEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out absolute top-0.5 ${
                    isEnabled ? "left-6.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsSettings;