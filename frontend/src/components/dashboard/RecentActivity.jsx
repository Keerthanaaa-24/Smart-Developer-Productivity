import {
  FaGithub,
  FaCode,
  FaGraduationCap,
  FaBook,
  FaCertificate,
  FaClock,
  FaStream,
  FaLinkedin,
  FaBriefcase,
  FaCheckDouble,
} from "react-icons/fa";

const platformStyles = {
  github: {
    icon: <FaGithub />,
    bg: "bg-slate-900 text-white",
    border: "border-slate-800",
  },
  leetcode: {
    icon: <FaCode />,
    bg: "bg-orange-500 text-white",
    border: "border-orange-600",
  },
  nptel: {
    icon: <FaGraduationCap />,
    bg: "bg-blue-600 text-white",
    border: "border-blue-700",
  },
  freecodecamp: {
    icon: <FaBook />,
    bg: "bg-emerald-600 text-white",
    border: "border-emerald-700",
  },
  geeksforgeeks: {
    icon: <FaCode />,
    bg: "bg-green-700 text-white",
    border: "border-green-800",
  },
  coursera: {
    icon: <FaCertificate />,
    bg: "bg-blue-500 text-white",
    border: "border-blue-600",
  },
  pomodoro: {
    icon: <FaClock />,
    bg: "bg-purple-600 text-white",
    border: "border-purple-700",
  },
  linkedin: {
    icon: <FaLinkedin />,
    bg: "bg-blue-700 text-white",
    border: "border-blue-800",
  },
  naukri: {
    icon: <FaBriefcase />,
    bg: "bg-indigo-600 text-white",
    border: "border-indigo-700",
  },
  tasks: {
    icon: <FaCheckDouble />,
    bg: "bg-emerald-600 text-white",
    border: "border-emerald-700",
  },
};

const RecentActivity = ({ timeline = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200/90 dark:border-slate-800 p-6 flex flex-col justify-between transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-lg shadow-xs">
              <FaStream />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Today's Activity Timeline
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live chronological developer telemetry feed.
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Feed
          </span>
        </div>

        {timeline.length === 0 ? (
          <div className="py-12 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              No activity recorded yet today
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-xs mx-auto">
              Start a coding session, complete a task, or run a Pomodoro timer to see your live timeline.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {timeline.slice(0, 6).map((item, idx) => {
              const platformKey = (item.platform || "coding").toLowerCase();
              const style = platformStyles[platformKey] || {
                icon: <FaCode />,
                bg: "bg-indigo-600 text-white",
                border: "border-indigo-700",
              };

              return (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center text-sm shadow-xs shrink-0`}
                  >
                    {style.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                      {item.message}
                    </p>
                    {item.details && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.details}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-slate-400">
                      {item.time || item.date || "Today"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-right">
        Auto-synced with developer events
      </div>
    </div>
  );
};

export default RecentActivity;