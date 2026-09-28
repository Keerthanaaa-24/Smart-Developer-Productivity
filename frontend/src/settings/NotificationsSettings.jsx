import { useState } from "react";

const NotificationsSettings = () => {
  const [notifications, setNotifications] = useState({
    coding: true,
    github: true,
    learning: true,
    pomodoro: true,
    weekly: true,
  });

  const toggleNotification = (key) => {
    setNotifications((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const options = [
    {
      key: "coding",
      title: "Coding Goals",
      description: "Receive reminders about your daily coding goals.",
    },
    {
      key: "github",
      title: "GitHub Activity",
      description: "Get notified about important GitHub activity.",
    },
    {
      key: "learning",
      title: "Learning Reminders",
      description: "Receive reminders to continue learning.",
    },
    {
      key: "pomodoro",
      title: "Pomodoro",
      description: "Receive notifications for Pomodoro sessions.",
    },
    {
      key: "weekly",
      title: "Weekly Report",
      description: "Receive your weekly productivity report.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Notifications
        </h2>

        <p className="text-gray-500 mt-1">
          Choose which notifications you want to receive.
        </p>
      </div>

      <div className="space-y-4">
        {options.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between gap-4 border rounded-xl p-5"
          >
            <div>
              <h3 className="font-semibold text-gray-800">
                {option.title}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {option.description}
              </p>
            </div>

            <button
              onClick={() => toggleNotification(option.key)}
              className={`relative w-12 h-6 rounded-full transition ${
                notifications[option.key]
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                  notifications[option.key]
                    ? "left-7"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsSettings;