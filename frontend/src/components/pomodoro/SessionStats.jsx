import { FaBullseye, FaChartBar, FaCalendarAlt } from "react-icons/fa";

const formatDurationFromSeconds = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const SessionStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
        </div>
        <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  const todaySessions = stats?.today_sessions_completed || 0;
  const todayFocusSeconds = stats?.today_focus_seconds || 0;
  const avgDurationMinutes = stats?.avg_session_duration_minutes || 0;
  const dailyGoalSeconds = stats?.daily_goal_seconds || 7200;
  const dailyGoalProgress = stats?.goal_progress_percent || 0;
  const weeklySessions = stats?.weekly_sessions_count || 0;
  const weeklyFocusSeconds = stats?.weekly_focus_seconds || 0;
  const weeklyTrend = stats?.weekly_trend || [];

  const maxTrendMins = Math.max(
    ...weeklyTrend.map((d) => d.focus_minutes || 0),
    60
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs dark:shadow-xl flex flex-col justify-between transition-colors duration-200">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FaChartBar />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Focus Telemetry</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time productivity telemetry</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Telemetry
          </span>
        </div>

        {/* Daily Goal Card */}
        <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FaBullseye className="text-indigo-600 dark:text-indigo-400 text-sm" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Daily Focus Goal
              </span>
            </div>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {formatDurationFromSeconds(todayFocusSeconds)} / {formatDurationFromSeconds(dailyGoalSeconds)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white dark:bg-slate-800 rounded-full h-3.5 p-0.5 border border-indigo-100 dark:border-indigo-900/40 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, dailyGoalProgress))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>{dailyGoalProgress}% Achieved</span>
            <span>
              {dailyGoalProgress >= 100
                ? "🎉 Daily Target Reached!"
                : `${formatDurationFromSeconds(Math.max(0, dailyGoalSeconds - todayFocusSeconds))} remaining`}
            </span>
          </div>
        </div>

        {/* 4-Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Today Sessions
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {todaySessions}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Today Focus
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              {formatDurationFromSeconds(todayFocusSeconds)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Avg Session
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {avgDurationMinutes > 0 ? `${avgDurationMinutes}m` : "0m"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              This Week
            </span>
            <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {formatDurationFromSeconds(weeklyFocusSeconds)}
            </span>
          </div>
        </div>

        {/* 7-Day Focus Trend */}
        <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FaCalendarAlt className="text-slate-400 dark:text-slate-500" />
              <span>7-Day Focus Distribution</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total: {weeklySessions} sessions
            </span>
          </div>

          {weeklyTrend.length > 0 ? (
            <div className="flex items-end justify-between gap-2 h-24 pt-4">
              {weeklyTrend.map((day, idx) => {
                const heightPercent =
                  maxTrendMins > 0 ? Math.round((day.focus_minutes / maxTrendMins) * 100) : 0;
                const isToday = idx === weeklyTrend.length - 1;

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-semibold py-0.5 px-2 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-10">
                      {Math.round(day.focus_minutes)}m ({day.sessions_count} sessions)
                    </div>

                    <div className="w-full max-w-[28px] bg-slate-200 dark:bg-slate-700 rounded-t-lg h-full flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday
                            ? "bg-blue-600"
                            : day.focus_minutes > 0
                            ? "bg-indigo-400 dark:bg-indigo-500 hover:bg-indigo-500"
                            : "bg-transparent"
                        }`}
                        style={{ height: `${Math.max(day.focus_minutes > 0 ? 12 : 0, heightPercent)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-semibold ${
                        isToday ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
              No session data for the past 7 days.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionStats;