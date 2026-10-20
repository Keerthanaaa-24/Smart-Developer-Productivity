import React, { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import leaderboardApi from "../api/leaderboardApi";
import {
  FaTrophy,
  FaMedal,
  FaCrown,
  FaFire,
  FaSearch,
  FaSyncAlt,
  FaUserGraduate,
  FaAward,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
  FaLock,
  FaCheckCircle,
} from "react-icons/fa";

const PODIUM_CONFIGS = [
  {
    rank: 1,
    title: "Champion",
    bgGradient: "from-amber-500/20 via-yellow-500/10 to-amber-500/5",
    border: "border-amber-500/40 dark:border-amber-500/50",
    badgeBg: "bg-amber-500 text-slate-950 font-black",
    crownColor: "text-amber-400 drop-shadow-md",
    ring: "ring-4 ring-amber-400/30",
  },
  {
    rank: 2,
    title: "Runner Up",
    bgGradient: "from-slate-300/20 via-slate-400/10 to-slate-300/5",
    border: "border-slate-300/40 dark:border-slate-500/50",
    badgeBg: "bg-slate-300 dark:bg-slate-400 text-slate-900 font-black",
    crownColor: "text-slate-300 drop-shadow-md",
    ring: "ring-4 ring-slate-400/30",
  },
  {
    rank: 3,
    title: "Third Place",
    bgGradient: "from-amber-700/20 via-orange-600/10 to-amber-700/5",
    border: "border-amber-700/40 dark:border-amber-700/50",
    badgeBg: "bg-amber-700 text-white font-black",
    crownColor: "text-amber-600 drop-shadow-md",
    ring: "ring-4 ring-amber-600/30",
  },
];

const Leaderboard = () => {
  const [period, setPeriod] = useState("all_time"); // "all_time" | "monthly" | "weekly"
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [myPosition, setMyPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchLeaderboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const [boardRes, myPosRes] = await Promise.allSettled([
          leaderboardApi.getLeaderboard({
            period,
            page,
            limit: 15,
            search,
          }),
          leaderboardApi.getMyLeaderboardPosition(period),
        ]);

        if (boardRes.status === "fulfilled") {
          setLeaderboardData(boardRes.value);
        } else {
          throw boardRes.reason;
        }

        if (myPosRes.status === "fulfilled") {
          setMyPosition(myPosRes.value);
        }
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
        setError("Unable to load live leaderboard rankings. Please check your connection.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, page, search]
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    setPage(1);
  };

  const students = leaderboardData?.students || [];
  const podiumStudents = leaderboardData?.podium || [];
  const totalPages = leaderboardData?.total_pages || 1;

  return (
    <MainLayout>
      <div className="space-y-7 pb-16 max-w-7xl mx-auto">
        {/* =========================================================
            HEADER & ACTIONS
        ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <FaTrophy className="text-amber-500" />
                Live Student Arena
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Real Verified Activity Only
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 flex items-center gap-3">
              Developer Leaderboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Compete fairly across genuine task completions, verified coding practice, Pomodoro focus deep work, and project milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              <FaSyncAlt className={`text-blue-500 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh Scores"}</span>
            </button>
          </div>
        </div>

        {/* =========================================================
            LOGGED-IN STUDENT POSITION BANNER
        ========================================================= */}
        {myPosition && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl shadow-blue-500/10">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-black text-2xl text-white shadow-inner">
                  #{myPosition.rank}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-blue-200">
                      Your Standing
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-bold">
                      {myPosition.level_title}
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-0.5">{myPosition.display_name}</h2>
                  <p className="text-xs text-blue-100 mt-1">
                    Rank <span className="font-bold text-white">#{myPosition.rank}</span> of{" "}
                    <span className="font-bold text-white">{myPosition.total_students}</span> registered student developers
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">Points</p>
                  <p className="text-lg font-black mt-0.5">{myPosition.points.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">Active Days</p>
                  <p className="text-lg font-black mt-0.5 flex items-center justify-center gap-1">
                    <FaFire className="text-amber-300 text-sm" />
                    {myPosition.total_active_days}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">Achievements</p>
                  <p className="text-lg font-black mt-0.5 flex items-center justify-center gap-1">
                    <FaAward className="text-purple-300 text-sm" />
                    {myPosition.achievement_count}
                  </p>
                </div>
              </div>
            </div>

            {/* Level Progress Bar */}
            {myPosition.next_level_points && (
              <div className="mt-4 pt-4 border-t border-white/15">
                <div className="flex items-center justify-between text-xs text-blue-100 font-medium mb-1.5">
                  <span>Level {myPosition.level} Progress</span>
                  <span>
                    {myPosition.points} / {myPosition.next_level_points} Points ({myPosition.level_progress_percentage}%)
                  </span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-300 to-yellow-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${myPosition.level_progress_percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            FILTERS & SEARCH TOOLBAR
        ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Period Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => handlePeriodChange("all_time")}
              className={`px-4 py-2 rounded-xl transition ${
                period === "all_time"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handlePeriodChange("monthly")}
              className={`px-4 py-2 rounded-xl transition ${
                period === "monthly"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Past 30 Days
            </button>
            <button
              onClick={() => handlePeriodChange("weekly")}
              className={`px-4 py-2 rounded-xl transition ${
                period === "weekly"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Past 7 Days
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search student by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 flex items-center justify-between text-xs font-semibold">
            <span>{error}</span>
            <button onClick={() => fetchLeaderboard(true)} className="underline font-bold ml-4">
              Retry
            </button>
          </div>
        )}

        {/* =========================================================
            TOP 3 PODIUM (Page 1 only & when >= 1 student)
        ========================================================= */}
        {page === 1 && !search && podiumStudents.length > 0 && !loading && (
          <div>
            <h2 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-3 px-1">
              Top Student Developers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {podiumStudents.map((student, idx) => {
                const conf = PODIUM_CONFIGS[idx] || PODIUM_CONFIGS[2];
                return (
                  <div
                    key={student.user_id}
                    className={`relative rounded-3xl p-6 bg-gradient-to-b ${conf.bgGradient} bg-white dark:bg-slate-900 border ${conf.border} shadow-lg transition hover:-translate-y-1 duration-200 flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-xl text-xs ${conf.badgeBg}`}>
                          Rank #{student.rank} • {conf.title}
                        </span>
                        <FaCrown className={`text-xl ${conf.crownColor}`} />
                      </div>

                      <div className="mt-5 flex items-center gap-3.5">
                        <div
                          className={`w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-xl text-slate-700 dark:text-slate-200 ${conf.ring} overflow-hidden`}
                        >
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={student.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            student.display_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight truncate max-w-[160px]">
                              {student.display_name}
                            </h3>
                            {student.is_self && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                You
                              </span>
                            )}
                            {student.is_private && (
                              <FaLock className="text-slate-400 text-xs" title="Private profile" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {student.level_title} (Lvl {student.level})
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Points</p>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {student.points.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Streak</p>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5 flex items-center justify-center gap-0.5">
                          <FaFire className="text-amber-500 text-xs" />
                          {student.total_active_days}d
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Awards</p>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5 flex items-center justify-center gap-0.5">
                          <FaAward className="text-purple-500 text-xs" />
                          {student.achievement_count}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            STUDENT RANKINGS TABLE
        ========================================================= */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Student Standings
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({leaderboardData?.total_students || 0} registered)
              </span>
            </h2>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Tie-breaker: Points → Active Days → Registration
            </span>
          </div>

          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl">
                <FaTrophy />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Student Scores Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                {search
                  ? `No students matched "${search}". Try searching another name or reset filters.`
                  : "No qualifying productivity points recorded for this period yet. Complete a task or focus session to take the top spot!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] border-b border-slate-200/60 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Rank</th>
                    <th className="py-3.5 px-4 sm:px-6">Student</th>
                    <th className="py-3.5 px-4 sm:px-6">Level</th>
                    <th className="py-3.5 px-4 sm:px-6">Active Days</th>
                    <th className="py-3.5 px-4 sm:px-6">Achievements</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {students.map((student) => {
                    const isSelf = student.is_self;
                    return (
                      <tr
                        key={student.user_id}
                        className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          isSelf
                            ? "bg-blue-50/70 dark:bg-blue-950/20 font-semibold"
                            : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-4 sm:px-6 font-black text-sm">
                          {student.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-slate-950 shadow-xs">
                              1
                            </span>
                          ) : student.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-300 dark:bg-slate-400 text-slate-900 shadow-xs">
                              2
                            </span>
                          ) : student.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-700 text-white shadow-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400 pl-2">
                              #{student.rank}
                            </span>
                          )}
                        </td>

                        {/* Student Name */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden shadow-xs">
                              {student.avatar_url ? (
                                <img
                                  src={student.avatar_url}
                                  alt={student.display_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                student.display_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                  {student.display_name}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-500 text-white">
                                    YOU
                                  </span>
                                )}
                                {student.is_private && (
                                  <FaLock
                                    className="text-slate-400 text-[10px]"
                                    title="Private student account"
                                  />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                @{student.username}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Level */}
                        <td className="py-4 px-4 sm:px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                            Lvl {student.level} • {student.level_title}
                          </span>
                        </td>

                        {/* Active Days / Streak */}
                        <td className="py-4 px-4 sm:px-6 text-slate-700 dark:text-slate-300 font-bold">
                          <span className="inline-flex items-center gap-1">
                            <FaFire className="text-amber-500" />
                            {student.total_active_days} days
                          </span>
                        </td>

                        {/* Achievement Count */}
                        <td className="py-4 px-4 sm:px-6 text-slate-700 dark:text-slate-300 font-semibold">
                          <span className="inline-flex items-center gap-1">
                            <FaAward className="text-purple-500" />
                            {student.achievement_count}
                          </span>
                        </td>

                        {/* Points */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                            {student.points.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-semibold">pts</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 cursor-pointer"
              >
                <FaChevronLeft className="text-[10px]" /> Previous
              </button>
              <span className="text-slate-500 dark:text-slate-400 font-bold">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next <FaChevronRight className="text-[10px]" />
              </button>
            </div>
          )}
        </div>

        {/* Scoring Policy Legend */}
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-2">
            <FaInfoCircle className="text-blue-500" />
            Transparent Scoring Policy
          </div>
          <p className="mb-2">
            Points are awarded strictly from verified actions and auditable transactions:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1 font-semibold text-[11px]">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="block text-emerald-600 dark:text-emerald-400 font-bold">+10 pts</span>
              Completed Task
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="block text-blue-600 dark:text-blue-400 font-bold">+5 pts</span>
              Pomodoro (&ge;15m)
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="block text-purple-600 dark:text-purple-400 font-bold">+5 pts</span>
              Coding Practice
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="block text-indigo-600 dark:text-indigo-400 font-bold">+10 pts</span>
              Project Milestone
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="block text-amber-600 dark:text-amber-400 font-bold">+2 pts</span>
              Daily Streak Day
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="block text-pink-600 dark:text-pink-400 font-bold">+15 pts</span>
              Verified Certificate
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Leaderboard;
