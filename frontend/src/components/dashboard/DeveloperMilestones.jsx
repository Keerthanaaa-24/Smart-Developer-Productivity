import { useMemo } from "react";
import {
  FaTrophy,
  FaMedal,
  FaGithub,
  FaFire,
  FaCheckCircle,
  FaCode,
  FaClock,
  FaCalendarCheck,
  FaLock,
} from "react-icons/fa";

const DeveloperMilestones = ({
  overview = {},
  streak = {},
  githubStats = {},
}) => {
  const milestones = useMemo(() => {
    const totalContr = githubStats?.streak?.total_contributions || githubStats?.commits?.total || streak?.total_contributions || 0;
    const longestStreak = streak?.longest_streak || 0;
    const currentStreak = streak?.current_streak || 0;
    const totalActiveDays = streak?.total_active_days || 0;
    const taskCount = overview?.task_stats?.completed || overview?.task_stats?.total || 0;
    const pomoCount = overview?.primary_metrics?.focus?.completed_sessions || (overview?.today_summary?.focus_seconds > 0 ? 1 : 0);

    return [
      {
        id: "gh-first",
        title: "First GitHub Contribution",
        desc: "Made verified open source and repository commits.",
        icon: FaGithub,
        color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
        unlocked: totalContr > 0,
        progress: 100,
        badge: "Unlocked",
      },
      {
        id: "streak-7",
        title: "7-Day Consistency Master",
        desc: "Maintained a continuous 7+ day coding streak.",
        icon: FaFire,
        color: "text-orange-400 bg-orange-500/15 border-orange-500/30",
        unlocked: longestStreak >= 7,
        progress: Math.min(100, Math.round((currentStreak / 7) * 100)),
        badge: `${currentStreak}/7 Days`,
      },
      {
        id: "streak-30",
        title: "30-Day Streak Champion",
        desc: "Achieved the prestigious 30-day streak milestone.",
        icon: FaTrophy,
        color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
        unlocked: longestStreak >= 30,
        progress: Math.min(100, Math.round((longestStreak / 30) * 100)),
        badge: "Champion (30d)",
      },
      {
        id: "commits-300",
        title: "300+ Commits Club",
        desc: "Pushed 300+ total contributions to GitHub.",
        icon: FaCode,
        color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
        unlocked: totalContr >= 300,
        progress: Math.min(100, Math.round((totalContr / 300) * 100)),
        badge: `${totalContr} Commits`,
      },
      {
        id: "active-100",
        title: "100+ Active Days Legend",
        desc: "Active across developer platforms for over 100 days.",
        icon: FaCalendarCheck,
        color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
        unlocked: totalActiveDays >= 100,
        progress: Math.min(100, Math.round((totalActiveDays / 100) * 100)),
        badge: `${totalActiveDays} Days`,
      },
      {
        id: "focus-master",
        title: "Pomodoro Focus Pro",
        desc: "Completed deep focus Pomodoro timer sessions.",
        icon: FaClock,
        color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
        unlocked: pomoCount >= 5,
        progress: Math.min(100, Math.round((pomoCount / 10) * 100)),
        badge: `${pomoCount} Sessions`,
      },
    ];
  }, [overview, streak, githubStats]);

  const unlockedCount = milestones.filter((m) => m.unlocked).length;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shadow-inner">
            <FaMedal />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Developer Milestones & Badges
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Verified Progress
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Evidence-based achievements earned through real coding, streak, and focus telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700/60">
          <span className="text-xs text-slate-400 font-medium">Unlocked:</span>
          <span className="text-sm font-bold text-amber-400">
            {unlockedCount} / {milestones.length}
          </span>
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {milestones.map((milestone) => {
          const Icon = milestone.icon;
          return (
            <div
              key={milestone.id}
              className={`rounded-2xl p-4.5 border transition-all ${
                milestone.unlocked
                  ? "bg-slate-800/70 border-slate-700/80 hover:border-slate-600 shadow-md"
                  : "bg-slate-900/40 border-slate-800/60 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${milestone.color}`}>
                    <Icon />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white leading-tight">
                      {milestone.title}
                    </h3>
                    <span className="text-[11px] font-medium text-amber-300/80">
                      {milestone.badge}
                    </span>
                  </div>
                </div>

                {milestone.unlocked ? (
                  <span className="shrink-0 text-emerald-400 text-sm">
                    <FaCheckCircle />
                  </span>
                ) : (
                  <span className="shrink-0 text-slate-500 text-xs">
                    <FaLock />
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">
                {milestone.desc}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    milestone.unlocked ? "bg-amber-400" : "bg-slate-500"
                  }`}
                  style={{ width: `${milestone.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeveloperMilestones;
