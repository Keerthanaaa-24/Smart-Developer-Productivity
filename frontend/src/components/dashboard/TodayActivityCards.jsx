import { FaCode, FaGraduationCap, FaBrain, FaClock, FaCheckCircle } from "react-icons/fa";

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const TodayActivityCards = ({ todaySummary = {} }) => {
  const codingSeconds = todaySummary?.coding_seconds ?? 0;
  const learningSeconds = todaySummary?.learning_seconds ?? 0;
  const problemSeconds = todaySummary?.problem_solving_seconds ?? 0;
  const focusSeconds = todaySummary?.focus_seconds ?? 0;

  const activities = [
    {
      title: "Coding & Repositories",
      seconds: codingSeconds,
      targetSeconds: 7200, // 2h goal
      icon: <FaCode />,
      color: "from-blue-600 to-indigo-600",
      bgLight: "bg-blue-50 text-blue-700 border-blue-200",
      barColor: "bg-blue-600",
      detail:
        todaySummary?.github_activities_today > 0
          ? `${todaySummary.github_activities_today} GitHub actions logged today`
          : todaySummary?.github_connected
          ? `@${todaySummary.github_username} linked · ${todaySummary.github_total_stored || 0} events synced`
          : codingSeconds > 0
          ? "Active coding session"
          : "No coding activity yet today",
      subnotice:
        "GitHub commits are discrete events. Active time tracks live coding sessions.",
    },
    {
      title: "Learning & Theory",
      seconds: learningSeconds,
      targetSeconds: 3600, // 1h goal
      icon: <FaGraduationCap />,
      color: "from-emerald-600 to-teal-600",
      bgLight: "bg-emerald-50 text-emerald-700 border-emerald-200",
      barColor: "bg-emerald-600",
      detail:
        learningSeconds > 0
          ? "Coursera, NPTEL & freeCodeCamp modules"
          : "No learning activity yet today",
    },
    {
      title: "Algorithmic Problem Solving",
      seconds: problemSeconds,
      targetSeconds: 2700, // 45m goal
      icon: <FaBrain />,
      color: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 text-amber-700 border-amber-200",
      barColor: "bg-orange-500",
      detail:
        problemSeconds > 0
          ? "LeetCode & GeeksForGeeks practice"
          : "No problem-solving activity yet today",
    },
    {
      title: "Deep Focus & Pomodoro",
      seconds: focusSeconds,
      targetSeconds: 3600, // 1h goal
      icon: <FaClock />,
      color: "from-purple-600 to-pink-600",
      bgLight: "bg-purple-50 text-purple-700 border-purple-200",
      barColor: "bg-purple-600",
      detail:
        focusSeconds > 0
          ? "Focused deep-work sprint"
          : "No Pomodoro sessions logged yet",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Today's Activity Breakdown
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real time spent across developer domains today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {activities.map((act) => {
          const progressPercent = Math.min(
            100,
            Math.round((act.seconds / act.targetSeconds) * 100)
          );
          const hasTime = act.seconds > 0;

          return (
            <div
              key={act.title}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${act.color} text-white flex items-center justify-center text-base shadow-sm`}
                  >
                    {act.icon}
                  </div>
                  {hasTime ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <FaCheckCircle className="text-[10px]" />
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                      0%
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-slate-600">{act.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {formatDuration(act.seconds)}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Daily Progress</span>
                  <span className="font-semibold text-slate-700">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${act.barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 truncate">
                  {act.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodayActivityCards;
