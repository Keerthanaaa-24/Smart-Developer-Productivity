import { FaFire, FaTrophy, FaCalendarCheck } from "react-icons/fa";

const StreakCard = ({ streakData = {} }) => {
  const currentStreak = streakData?.current_streak ?? 0;
  const longestStreak = streakData?.longest_streak ?? 0;
  const totalActiveDays = streakData?.total_active_days ?? streakData?.total_login_days ?? 0;
  const todayActive = streakData?.today_active ?? streakData?.today_logged_in ?? false;
  const activePlatforms = streakData?.today_platforms ?? [];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 text-white p-6 shadow-lg flex flex-col justify-between relative overflow-hidden">
      {/* Background glow circle */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              <FaFire className="text-orange-200 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider">
                Consistency Hub
              </p>
              <h2 className="text-xl font-bold leading-tight">
                Developer Streak
              </h2>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md border ${
              todayActive
                ? "bg-emerald-400/20 text-emerald-100 border-emerald-300/30"
                : "bg-white/15 text-orange-100 border-white/20"
            }`}
          >
            {todayActive ? "Active Today ✓" : "Pending Activity"}
          </span>
        </div>

        <div className="mt-6 flex items-baseline gap-2">
          <span className="text-5xl font-black tracking-tight">{currentStreak}</span>
          <span className="text-xl font-semibold text-orange-100">
            {currentStreak === 1 ? "Day Streak" : "Days Streak"}
          </span>
        </div>

        <p className="text-xs text-orange-100/90 mt-2">
          {currentStreak > 0
            ? "Your developer momentum is alive. Keep coding to extend your streak!"
            : "Complete any coding, learning, or task session today to initiate your streak."}
        </p>

        {activePlatforms.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activePlatforms.map((plat) => (
              <span
                key={plat}
                className="text-[11px] font-medium bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/15 capitalize"
              >
                {plat}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-white/10 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-orange-100/80 mb-1">
            <FaTrophy className="text-yellow-300" />
            <span>Best Streak</span>
          </div>
          <p className="text-base font-bold">
            {longestStreak} <span className="text-xs font-normal">days</span>
          </p>
        </div>

        <div className="bg-white/10 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 text-orange-100/80 mb-1">
            <FaCalendarCheck className="text-emerald-300" />
            <span>Total Active</span>
          </div>
          <p className="text-base font-bold">
            {totalActiveDays} <span className="text-xs font-normal">days</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StreakCard;