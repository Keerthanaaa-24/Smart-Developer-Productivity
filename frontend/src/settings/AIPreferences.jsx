import { useState } from "react";

const AIPreferences = () => {
  const [preferences, setPreferences] = useState({
    productivity: true,
    learning: true,
    career: true,
    weeklyReport: true,
  });

  const togglePreference = (key) => {
    setPreferences((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const options = [
    {
      key: "productivity",
      title: "AI Productivity Insights",
      description:
        "Receive AI-generated suggestions based on your development activity.",
    },
    {
      key: "learning",
      title: "Learning Recommendations",
      description:
        "Allow AI to recommend courses and learning resources.",
    },
    {
      key: "career",
      title: "Career Suggestions",
      description:
        "Receive AI-powered career and skill recommendations.",
    },
    {
      key: "weeklyReport",
      title: "AI Weekly Report",
      description:
        "Generate a weekly summary of your productivity and progress.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          AI Preferences
        </h2>

        <p className="text-gray-500 mt-1">
          Customize how AI features work in your developer dashboard.
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
              onClick={() => togglePreference(option.key)}
              className={`relative w-12 h-6 rounded-full transition ${
                preferences[option.key]
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                  preferences[option.key]
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

export default AIPreferences;