import { useState } from "react";
import { FaSun, FaMoon, FaDesktop, FaCheckCircle, FaPalette } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

const AppearanceSettings = () => {
  const { theme, setTheme } = useTheme();
  const [feedback, setFeedback] = useState(null);

  const handleSelectTheme = async (selectedTheme) => {
    setTheme(selectedTheme);
    setFeedback({
      type: "success",
      message: `Appearance updated to ${selectedTheme.toUpperCase()} mode.`,
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const themeOptions = [
    {
      id: "light",
      title: "Light Mode",
      description: "Clean, crisp light aesthetic optimized for bright daytime working conditions.",
      icon: <FaSun className="text-amber-500 text-xl" />,
      previewBg: "bg-white border-slate-200",
      indicatorColor: "bg-amber-500",
    },
    {
      id: "dark",
      title: "Dark Mode",
      description: "Sleek, deep charcoal dark aesthetic tailored for focus, night coding, and reduced eye strain.",
      icon: <FaMoon className="text-indigo-400 text-xl" />,
      previewBg: "bg-slate-900 border-slate-700 text-white",
      indicatorColor: "bg-indigo-500",
    },
    {
      id: "system",
      title: "System Preference",
      description: "Automatically synchronizes with your operating system light / dark schedule.",
      icon: <FaDesktop className="text-blue-500 text-xl" />,
      previewBg: "bg-gradient-to-r from-slate-100 to-slate-900 border-slate-400",
      indicatorColor: "bg-blue-500",
    },
  ];

  return (
    <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl transition-colors duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
            <FaPalette />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Appearance & Theme</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Customize the visual theme and contrast across your productivity workspace.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 animate-fadeIn">
          <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0 text-base" />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mb-6">
        {themeOptions.map((opt) => {
          const isSelected = theme === opt.id;
          return (
            <button
              id={`theme-option-${opt.id}`}
              key={opt.id}
              onClick={() => handleSelectTheme(opt.id)}
              className={`p-5 rounded-2xl border-2 text-left transition flex flex-col justify-between relative cursor-pointer group ${
                isSelected
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                    {opt.icon}
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                      <FaCheckCircle />
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{opt.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{opt.description}</p>
              </div>

              <div className={`mt-4 h-12 rounded-xl border p-2 flex items-center gap-1.5 ${opt.previewBg}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${opt.indicatorColor}`}></span>
                <span className="w-12 h-2 rounded bg-slate-300/60 dark:bg-slate-700"></span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 max-w-4xl">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Active Theme: <strong className="text-slate-900 dark:text-white capitalize font-bold">{theme} Mode</strong>.
          Changes take effect instantly across Dashboard, Activity Center, Projects, Tasks, Pomodoro, Analytics, and Navigation.
        </p>
      </div>
    </div>
  );
};

export default AppearanceSettings;