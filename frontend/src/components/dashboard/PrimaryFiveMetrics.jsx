import { useState, useMemo } from "react";
import {
  FaCode,
  FaClock,
  FaTasks,
  FaFire,
  FaChartLine,
  FaInfoCircle,
  FaCheckCircle,
  FaBolt,
} from "react-icons/fa";

const PrimaryFiveMetrics = ({ metrics, todaySummary }) => {
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  const coding = metrics?.coding || {
    formatted: "0m",
    seconds: 0,
    events_count: todaySummary?.github_activities_today || 0,
    target_hours: 2.0,
    progress_pct: 0,
  };

  const focus = metrics?.focus || {
    formatted: "0m",
    seconds: 0,
    completed_sessions: 0,
    target_minutes: 120,
    progress_pct: 0,
  };

  const tasks = metrics?.tasks || {
    completed: 0,
    total: 0,
    percentage: 0,
    pending: 0,
  };

  const loginStreak = metrics?.login_streak || {
    current_streak: 1,
    longest_streak: 1,
    today_logged_in: true,
    total_login_days: 1,
  };

  const productivity = metrics?.productivity || {
    score: todaySummary?.productivity_score || 0,
    breakdown: todaySummary?.score_breakdown || {
      coding: 0,
      focus: 0,
      tasks: 0,
      login: 0,
      coding_max: 35.0,
      focus_max: 25.0,
      tasks_max: 25.0,
      login_max: 15.0,
    },
  };

  const score = productivity.score || 0;
  const breakdown = productivity.breakdown || {};

  const scoreBadge = useMemo(() => {
    if (score >= 80) {
      return { text: "Peak Momentum", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
    }
    if (score >= 50) {
      return { text: "High Productivity", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
    }
    if (score >= 20) {
      return { text: "Steady Progress", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
    }
    return { text: "Getting Started", color: "bg-slate-700/60 text-slate-300 border-slate-600/50" };
  }, [score]);

  return (
    <div className="space-y-4">
      {/* 5 Primary Metrics: Left Hero Score + Right 4 Compact Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* =========================================================================
            PRIMARY HERO METRIC: PRODUCTIVITY SCORE (LEFT)
        ========================================================================= */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden group">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <FaBolt className="text-indigo-400" />
                Productivity Score
              </span>
              <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${scoreBadge.color}`}>
                {scoreBadge.text}
              </span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 tracking-tight">
                  {score}
                </span>
                <span className="text-xl text-slate-400 font-bold">/ 100</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Weighted index of coding, focus, tasks, and consistency.
              </p>
            </div>

            {/* Score Progress Bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5 font-medium">
                <span>Overall Rating</span>
                <span className="text-indigo-300 font-bold">{score}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, score)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Breakdown Toggle & Signals */}
          <div className="relative z-10 mt-6 pt-4 border-t border-indigo-900/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Signals: 4 tracked</span>
            </div>

            <button
              onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-1.5 rounded-xl border border-indigo-500/30 transition cursor-pointer"
            >
              <FaInfoCircle className="text-[11px]" />
              <span>{showScoreBreakdown ? "Hide Details" : "Score Breakdown"}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            FOUR COMPACT METRIC CARDS (RIGHT 2x2 GRID)
        ========================================================================= */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* 1. CODING TIME */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Coding Time
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform">
                  <FaCode />
                </div>
              </div>

              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {coding.formatted}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {coding.events_count > 0
                  ? `${coding.events_count} verified session event${coding.events_count !== 1 ? "s" : ""}`
                  : "Active IDE & GitHub telemetry"}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Weight in score:</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold text-[11px]">35% max</span>
            </div>
          </div>

          {/* 2. POMODORO FOCUS TIME */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Focus Time
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm border border-purple-100 dark:border-purple-500/20 group-hover:scale-110 transition-transform">
                  <FaClock />
                </div>
              </div>

              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {focus.formatted}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {focus.completed_sessions} completed focus session
                {focus.completed_sessions !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Weight in score:</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold text-[11px]">25% max</span>
            </div>
          </div>

          {/* 3. TASKS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tasks
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm border border-emerald-100 dark:border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <FaTasks />
                </div>
              </div>

              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {tasks.completed}
                <span className="text-sm font-normal text-slate-400 ml-1">
                  / {tasks.total}
                </span>
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {tasks.percentage}% completion rate
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Execution</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {tasks.percentage}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, tasks.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4. LOGIN STREAK */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Login Streak
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm border border-amber-100 dark:border-amber-500/20 group-hover:scale-110 transition-transform">
                  <FaFire />
                </div>
              </div>

              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {loginStreak.current_streak}
                <span className="text-sm font-normal text-slate-400 ml-1">
                  day{loginStreak.current_streak !== 1 ? "s" : ""}
                </span>
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Best record: {loginStreak.longest_streak} day{loginStreak.longest_streak !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Daily Login</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <FaCheckCircle /> Recorded
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Expandable Score Breakdown Banner */}
      {showScoreBreakdown && (
        <div className="bg-slate-900/95 border border-indigo-500/30 rounded-3xl p-5 text-xs text-slate-300 animate-fadeIn shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-white flex items-center gap-2 text-sm">
              <FaInfoCircle className="text-indigo-400" />
              Productivity Score Calculation Breakdown (0 – 100 pts)
            </span>
            <button
              onClick={() => setShowScoreBreakdown(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-800">
            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-slate-400 font-medium">1. Coding (35%)</span>
              <p className="text-base font-black text-blue-400 mt-0.5">
                {breakdown.coding || 0} <span className="text-xs font-normal text-slate-400">/ 35.0 pts</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">IDE active coding telemetry</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-slate-400 font-medium">2. Focus (25%)</span>
              <p className="text-base font-black text-purple-400 mt-0.5">
                {breakdown.focus || 0} <span className="text-xs font-normal text-slate-400">/ 25.0 pts</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Pomodoro deep work minutes</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-slate-400 font-medium">3. Tasks (25%)</span>
              <p className="text-base font-black text-emerald-400 mt-0.5">
                {breakdown.tasks || 0} <span className="text-xs font-normal text-slate-400">/ 25.0 pts</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Daily task completion ratio</p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
              <span className="text-slate-400 font-medium">4. Consistency (15%)</span>
              <p className="text-base font-black text-amber-400 mt-0.5">
                {breakdown.login || 0} <span className="text-xs font-normal text-slate-400">/ 15.0 pts</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Daily active login streak</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrimaryFiveMetrics;
