import { useState, useEffect, useCallback } from "react";
import timeTrackingApi from "../../api/timeTrackingApi";

const PLATFORM_ICONS = {
  github: "🐙",
  leetcode: "💻",
  coursera: "📚",
  nptel: "🎓",
  geeksforgeeks: "🟢",
  freecodecamp: "🔥",
  linkedin: "💼",
  naukri: "👔",
  vscode: "⚡",
};

const PLATFORM_COLORS = {
  github: "from-slate-700 to-slate-900 border-slate-700 text-slate-100",
  leetcode: "from-amber-500/20 to-amber-700/20 border-amber-500/30 text-amber-400",
  coursera: "from-blue-500/20 to-blue-700/20 border-blue-500/30 text-blue-400",
  nptel: "from-emerald-500/20 to-emerald-700/20 border-emerald-500/30 text-emerald-400",
  geeksforgeeks: "from-green-500/20 to-green-700/20 border-green-500/30 text-green-400",
  freecodecamp: "from-yellow-500/20 to-yellow-700/20 border-yellow-500/30 text-yellow-400",
  linkedin: "from-sky-500/20 to-sky-700/20 border-sky-500/30 text-sky-400",
  naukri: "from-indigo-500/20 to-indigo-700/20 border-indigo-500/30 text-indigo-400",
  vscode: "from-cyan-500/20 to-cyan-700/20 border-cyan-500/30 text-cyan-400",
};

const PlatformTimeTrackingCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today"); // "today" | "week" | "targets" | "sessions"
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState("all");

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await timeTrackingApi.getSummary();
      setData(res);
    } catch (err) {
      console.warn("Time tracking summary error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await timeTrackingApi.getSessions({
        limit: 15,
        platform: selectedPlatformFilter !== "all" ? selectedPlatformFilter : undefined,
      });
      setSessions(res.sessions || []);
    } catch (err) {
      console.warn("Time tracking sessions error:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedPlatformFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === "sessions") {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  if (loading && !data) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  const todayData = data?.today || { active_seconds: 0, by_platform: [] };
  const weekData = data?.this_week || { active_seconds: 0, by_platform: [], daily_distribution: [] };
  const targets = data?.targets || {};
  const mostUsed = data?.most_used_platform;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/90 via-slate-50/80 to-blue-50/30 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-indigo-950/20 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shadow-sm">
              ⏱️
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Platform Time Tracking Engine
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Live Phase 2
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Accurate, privacy-first active website duration with automatic 60s idle exclusion.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium self-start sm:self-auto">
          {[
            { id: "today", label: "Today" },
            { id: "week", label: "7-Day Breakdown" },
            { id: "targets", label: "Goal Progress" },
            { id: "sessions", label: "Session Log" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all duration-200 font-semibold cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* METRIC EXPLANATION ALERT (Feature 3 Requirement) */}
      <div className="mb-6 p-3.5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span className="text-blue-500 text-base leading-none mt-0.5">ℹ️</span>
        <div className="leading-relaxed">
          <strong className="text-slate-900 dark:text-white font-semibold">Metric Lineage:</strong>{" "}
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">Estimated Active Website Time</span> measures foreground browser focus on supported domains only. It is strictly separated from <em>GitHub contribution commits</em>, <em>Pomodoro timers</em>, and <em>manually recorded goals</em>.
        </div>
      </div>

      {/* TAB 1: TODAY OVERVIEW */}
      {activeTab === "today" && (
        <div className="space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Today's Active Time
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {todayData.formatted || "0m"}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                Across {todayData.sessions_count || 0} active interval(s)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Idle Time Excluded
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {todayData.idle_excluded_formatted || "0m"}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                Filtered automatically (&gt;60s threshold)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 backdrop-blur-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Top Platform
              </span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight flex items-center gap-1.5">
                <span>{mostUsed?.icon || "⚡"}</span>
                <span className="truncate">{mostUsed?.name || "None yet"}</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                {mostUsed ? `${mostUsed.formatted} active duration` : "Start browsing supported sites"}
              </span>
            </div>
          </div>

          {/* Platform Distribution Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>Today's Platform Time Allocation</span>
              <span className="text-xs font-normal text-slate-500">
                {todayData.by_platform?.length || 0} active platform(s)
              </span>
            </h3>

            {todayData.by_platform && todayData.by_platform.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {todayData.by_platform.map((p) => {
                  const platKey = p.platform.toLowerCase();
                  const icon = PLATFORM_ICONS[platKey] || p.icon || "💻";
                  const colorClass = PLATFORM_COLORS[platKey] || "from-slate-700/20 to-slate-900/20 border-slate-700";

                  return (
                    <div
                      key={p.platform}
                      className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between hover:border-indigo-500/40 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {p.percentage}%
                        </span>
                      </div>

                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {p.formatted}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200/70 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${p.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No browser activity captured for today yet.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Open your connected browser extension and browse supported domains like GitHub, LeetCode, Coursera, or GeeksforGeeks to automatically measure active time.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 7-DAY BREAKDOWN & DISTRIBUTION CHART */}
      {activeTab === "week" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Weekly Measured Active Duration: <strong className="text-slate-900 dark:text-white font-bold">{weekData.formatted}</strong>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {weekData.sessions_count || 0} total sessions this week
            </span>
          </div>

          {/* Daily Bar Chart Representation */}
          <div className="p-5 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
              Daily Time Allocation (Hours)
            </h4>
            <div className="grid grid-cols-7 gap-2 items-end h-40 pt-4">
              {(weekData.daily_distribution || []).map((day) => {
                const maxVal = Math.max(...(weekData.daily_distribution || []).map((d) => d.active_hours), 1);
                const heightPercent = Math.min(100, Math.max(8, (day.active_hours / maxVal) * 100));

                return (
                  <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.active_hours}h
                    </div>
                    <div
                      className="w-full max-w-[36px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {day.day_name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Platforms List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(weekData.by_platform || []).map((p) => (
              <div
                key={p.platform}
                className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{PLATFORM_ICONS[p.platform.toLowerCase()] || "💻"}</span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h5>
                    <span className="text-[11px] text-slate-500">{p.formatted}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {p.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GOALS & TARGETS PROGRESS */}
      {activeTab === "targets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coding Target */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💻</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Daily Coding Target</h4>
                    <span className="text-xs text-slate-500">GitHub & VS Code foreground focus</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {targets.coding?.percentage || 0}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {targets.coding?.actual_formatted || "0m"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Goal: {targets.coding?.target_hours || 2}h / day
                </span>
              </div>

              <div className="w-full bg-slate-200/80 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, targets.coding?.percentage || 0)}%` }}
                />
              </div>
            </div>

            {/* Learning Target */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📚</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Daily Learning Target</h4>
                    <span className="text-xs text-slate-500">Coursera, LeetCode, GFG, freeCodeCamp, NPTEL</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {targets.learning?.percentage || 0}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {targets.learning?.actual_formatted || "0m"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Goal: {targets.learning?.target_hours || 1}h / day
                </span>
              </div>

              <div className="w-full bg-slate-200/80 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, targets.learning?.percentage || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RECENT VERIFIED SESSIONS */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Recent Verified Browser Sessions
            </h4>
            <select
              value={selectedPlatformFilter}
              onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Platforms</option>
              <option value="github">GitHub</option>
              <option value="leetcode">LeetCode</option>
              <option value="coursera">Coursera</option>
              <option value="geeksforgeeks">GeeksforGeeks</option>
              <option value="freecodecamp">freeCodeCamp</option>
              <option value="nptel">NPTEL</option>
              <option value="linkedin">LinkedIn</option>
              <option value="naukri">Naukri</option>
            </select>
          </div>

          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div
                  key={s.id || s.session_key}
                  className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{s.icon || "💻"}</span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                      <span className="text-slate-500 ml-2">({s.domain || "verified"})</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(s.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {s.active_formatted}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      Idle: {s.idle_formatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No sessions found for the selected filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlatformTimeTrackingCard;
