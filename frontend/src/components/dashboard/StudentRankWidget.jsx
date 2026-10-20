import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaTrophy, FaFire, FaAward, FaArrowRight, FaCrown, FaMedal } from "react-icons/fa";
import leaderboardApi from "../../api/leaderboardApi";

const StudentRankWidget = () => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPosition = async () => {
      try {
        const data = await leaderboardApi.getMyLeaderboardPosition("all_time");
        if (isMounted) setPosition(data);
      } catch (err) {
        console.warn("Could not load student rank widget:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPosition();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading && !position) {
    return (
      <div className="h-28 rounded-3xl bg-slate-200/80 dark:bg-slate-900/60 animate-pulse border border-slate-300/60 dark:border-slate-800" />
    );
  }

  if (!position) return null;

  const rankBadgeBg =
    position.rank === 1
      ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
      : position.rank === 2
      ? "bg-slate-300 dark:bg-slate-400 text-slate-900 font-black"
      : position.rank === 3
      ? "bg-amber-700 text-white font-black"
      : "bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-black";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 text-white shadow-lg">
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* Left: Rank & Title */}
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shrink-0 ${rankBadgeBg}`}
          >
            {position.rank <= 3 ? (
              <FaTrophy className="text-xl" />
            ) : (
              <span>#{position.rank}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <FaCrown /> Live Competition
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200">
                Lvl {position.level} • {position.level_title}
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-0.5 flex items-center gap-2">
              Global Rank #{position.rank}
              <span className="text-xs font-normal text-slate-400">
                (of {position.total_students} students)
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              <span className="font-bold text-amber-300">{position.points.toLocaleString()}</span> Productivity Points Earned
            </p>
          </div>
        </div>

        {/* Center: Quick Stats */}
        <div className="flex items-center gap-4 sm:gap-6 text-center bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 self-start sm:self-auto">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Streak</p>
            <p className="text-sm font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
              <FaFire /> {position.total_active_days}d
            </p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Achievements</p>
            <p className="text-sm font-black text-purple-400 mt-0.5 flex items-center justify-center gap-1">
              <FaAward /> {position.achievement_count}
            </p>
          </div>
          {position.next_level_points && (
            <>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Next Tier</p>
                <p className="text-sm font-black text-emerald-400 mt-0.5">
                  {position.level_progress_percentage}%
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right: Link to full leaderboard */}
        <Link
          to="/leaderboard"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 whitespace-nowrap self-start md:self-auto"
        >
          <span>View Leaderboard</span>
          <FaArrowRight className="text-[10px]" />
        </Link>
      </div>
    </div>
  );
};

export default StudentRankWidget;
