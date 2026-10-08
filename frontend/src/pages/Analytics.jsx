import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaGithub,
  FaFire,
  FaCode,
  FaChartLine,
  FaCheckCircle,
  FaSyncAlt,
  FaExternalLinkAlt,
  FaClock,
  FaGraduationCap,
  FaBrain,
  FaExclamationTriangle,
  FaArrowRight,
  FaLayerGroup,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import MainLayout from "../layouts/MainLayout";
import API from "../api/axios";
import {
  getGithubStatistics,
  getGithubDailyContributions,
  getGithubLanguages,
  getGithubStatus,
} from "../api/githubApi";
import { getDashboardOverview } from "../api/dashboardApi";
import ContributionHeatmap from "../components/analytics/ContributionHeatmap";
import LanguageUsageChart from "../components/analytics/LanguageUsageChart";
import { useTheme } from "../context/ThemeContext";

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const SkeletonCard = ({ className = "h-32" }) => (
  <div className={`bg-slate-200/80 dark:bg-slate-800/80 animate-pulse rounded-2xl ${className}`} />
);

const Custom30DayTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-700">
        <p className="font-semibold text-slate-200">{data.formattedDate || label}</p>
        <p className="text-blue-400 font-bold mt-1">
          {data.contributions} {data.contributions === 1 ? "contribution" : "contributions"}
        </p>
      </div>
    );
  }
  return null;
};

// Session cache helpers for instantaneous paint
const getAnalyticsCacheKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id ? `sdp_analytics_cache_${user.id}` : null;
  } catch {
    return null;
  }
};

const getCachedAnalytics = () => {
  try {
    const key = getAnalyticsCacheKey();
    if (!key) return null;
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setCachedAnalytics = (data) => {
  try {
    const key = getAnalyticsCacheKey();
    if (!key || !data) return;
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
};

const Analytics = () => {
  const { isDark } = useTheme();
  const cachedData = useRef(getCachedAnalytics());

  const [streak, setStreak] = useState(() => cachedData.current?.streak || null);
  const [streakLoading, setStreakLoading] = useState(!cachedData.current?.streak);
  const [streakError, setStreakError] = useState("");

  const [githubStatus, setGithubStatus] = useState(() => cachedData.current?.githubStatus || null);
  const [githubStats, setGithubStats] = useState(() => cachedData.current?.githubStats || null);
  const [statsLoading, setStatsLoading] = useState(!cachedData.current?.githubStats);
  const [statsError, setStatsError] = useState("");

  const [dailyContributions, setDailyContributions] = useState(() => cachedData.current?.dailyContributions || []);
  const [contribLoading, setContribLoading] = useState(!cachedData.current?.dailyContributions);
  const [contribError, setContribError] = useState("");

  const [languagesRaw, setLanguagesRaw] = useState(() => cachedData.current?.languagesRaw || []);
  const [langLoading, setLangLoading] = useState(!cachedData.current?.languagesRaw);

  const [dashboardOverview, setDashboardOverview] = useState(() => cachedData.current?.dashboardOverview || null);
  const [overviewLoading, setOverviewLoading] = useState(!cachedData.current?.dashboardOverview);

  const [refreshing, setRefreshing] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Progressive telemetry loader
  const loadAnalytics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }
    setGlobalError("");

    if (isManualRefresh) {
      try {
        await API.post("/activity/sync");
      } catch (syncErr) {
        console.warn("Manual activity sync notice:", syncErr.message);
      }
    }

    // 1. Fetch Developer Streak
    if (!streak || isManualRefresh) setStreakLoading(true);
    API.get("/developer-activity/streak")
      .then((res) => {
        if (res.data) {
          setStreak(res.data);
          setStreakError("");
        }
      })
      .catch((err) => {
        console.warn("Streak fetch warning:", err.message);
        if (!streak) setStreakError("Unable to load streak telemetry.");
      })
      .finally(() => setStreakLoading(false));

    // 2. Fetch Dashboard Overview
    if (!dashboardOverview || isManualRefresh) setOverviewLoading(true);
    getDashboardOverview()
      .then((data) => {
        if (data) setDashboardOverview(data);
      })
      .catch((err) => {
        console.warn("Overview fetch warning:", err.message);
      })
      .finally(() => setOverviewLoading(false));

    // 3. Fetch GitHub Status and downstream GitHub telemetry
    getGithubStatus()
      .then(async (statusData) => {
        setGithubStatus(statusData);

        if (!statusData?.connected) {
          setStatsLoading(false);
          setContribLoading(false);
          setLangLoading(false);
          setGithubStats(null);
          setDailyContributions([]);
          setLanguagesRaw([]);
          return;
        }

        // Fetch GitHub Stats
        if (!githubStats || isManualRefresh) setStatsLoading(true);
        getGithubStatistics()
          .then((stats) => {
            if (stats) {
              setGithubStats(stats);
              setStatsError("");
            }
          })
          .catch((err) => {
            console.warn("GitHub stats fetch warning:", err.message);
            if (!githubStats) setStatsError("Unable to load GitHub stats.");
          })
          .finally(() => setStatsLoading(false));

        // Fetch GitHub Daily Contributions
        if (dailyContributions.length === 0 || isManualRefresh) setContribLoading(true);
        getGithubDailyContributions()
          .then((contrib) => {
            if (contrib) {
              const days = contrib.days || contrib.contributions || [];
              setDailyContributions(days);
              setContribError("");
            }
          })
          .catch((err) => {
            console.warn("GitHub contributions fetch warning:", err.message);
            if (dailyContributions.length === 0) {
              setContribError("Unable to load contribution calendar.");
            }
          })
          .finally(() => setContribLoading(false));

        // Fetch GitHub Languages
        if (languagesRaw.length === 0 || isManualRefresh) setLangLoading(true);
        getGithubLanguages()
          .then((langData) => {
            if (langData) {
              const items = langData.languages || (Array.isArray(langData) ? langData : []);
              setLanguagesRaw(items);
            }
          })
          .catch((err) => {
            console.warn("GitHub languages fetch warning:", err.message);
          })
          .finally(() => setLangLoading(false));
      })
      .catch((err) => {
        console.warn("GitHub status check warning:", err.message);
        setStatsLoading(false);
        setContribLoading(false);
        setLangLoading(false);
      });

    setLastSyncTime(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
    setRefreshing(false);
  }, [streak, dashboardOverview, githubStats, dailyContributions.length, languagesRaw.length]);

  // Persist session cache on data updates
  useEffect(() => {
    setCachedAnalytics({
      streak,
      githubStatus,
      githubStats,
      dailyContributions,
      languagesRaw,
      dashboardOverview,
    });
  }, [streak, githubStatus, githubStats, dailyContributions, languagesRaw, dashboardOverview]);

  useEffect(() => {
    loadAnalytics();

    const handleBackendWarmed = () => {
      loadAnalytics(false);
    };

    window.addEventListener("backend-warmed", handleBackendWarmed);
    return () => {
      window.removeEventListener("backend-warmed", handleBackendWarmed);
    };
  }, [loadAnalytics]);

  // Languages data
  const languagesList = useMemo(() => {
    if (languagesRaw && languagesRaw.length > 0) {
      return languagesRaw.map((l) => ({
        name: l.language || l.name,
        percentage: Number(l.percentage || 0),
        bytes: Number(l.bytes || 0),
      }));
    }
    return [];
  }, [languagesRaw]);

  // Last 30 days bar chart data
  const recent30Days = useMemo(() => {
    if (!dailyContributions || dailyContributions.length === 0) return [];
    return dailyContributions.slice(-30).map((item) => {
      const dateStr = item.date || item.day;
      let label = dateStr;
      if (dateStr) {
        try {
          const d = new Date(dateStr);
          label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        } catch {
          label = dateStr;
        }
      }
      return {
        day: label,
        formattedDate: dateStr,
        contributions: Number(item.count ?? item.contributions ?? 0),
      };
    });
  }, [dailyContributions]);

  const total30DayContributions = useMemo(() => {
    return recent30Days.reduce((sum, d) => sum + d.contributions, 0);
  }, [recent30Days]);

  // Streak & Milestone numbers from authentic telemetry
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const totalActiveDays = streak?.total_active_days ?? 0;
  const githubStreak = githubStats?.streak?.current_streak ?? 0;
  const totalContributions = githubStats?.streak?.total_contributions ?? (githubStats?.commits?.total ?? 0);

  // GitHub Counts
  const repoCount = githubStats?.repositories?.total ?? (githubStats?.repositories?.public ?? 0);
  const commitCount = githubStats?.commits?.total ?? 0;
  const activeEventsCount = githubStats?.activity?.total ?? (githubStats?.activity?.recent_events?.length ?? 0);
  const ghUsername = githubStatus?.github?.username || githubStats?.user?.username || (githubStatus?.connected ? "connected-user" : null);
  const isGithubConnected = Boolean(githubStatus?.connected);

  // Platforms model derived dynamically from /dashboard/overview with authentic integration states
  const platformsData = useMemo(() => {
    const overviewPlatforms = dashboardOverview?.platforms || {};
    const activeTodayList = streak?.today_platforms || [];

    const supportedKeys = [
      { key: "github", name: "GitHub", icon: "🐙", desc: "Commits, Repositories, PRs", defaultMode: "OAuth API" },
      { key: "vscode", name: "VS Code Extension", icon: "⚡", desc: "IDE Active Coding Telemetry", defaultMode: "IDE Extension" },
      { key: "leetcode", name: "LeetCode", icon: "💻", desc: "Problem Solving & Contests", defaultMode: "Public Profile" },
      { key: "geeksforgeeks", name: "GeeksforGeeks", icon: "🟢", desc: "Coding Score & Practice", defaultMode: "Public Profile" },
      { key: "freecodecamp", name: "freeCodeCamp", icon: "🔥", desc: "Web & Core Certifications", defaultMode: "Public Profile" },
      { key: "nptel", name: "NPTEL", icon: "🎓", desc: "Academic Courses", defaultMode: "Manual Milestones" },
      { key: "coursera", name: "Coursera", icon: "📚", desc: "Specializations & Modules", defaultMode: "Manual Milestones" },
      { key: "linkedin", name: "LinkedIn", icon: "💼", desc: "Career Milestones & Profile", defaultMode: "Career Milestones" },
      { key: "naukri", name: "Naukri", icon: "👔", desc: "Job Pipeline Tracking", defaultMode: "Career Milestones" },
      { key: "pomodoro", name: "Pomodoro / Focus", icon: "⏱️", desc: "Deep Work Sessions", defaultMode: "Native Telemetry" },
      { key: "tasks", name: "Tasks Engine", icon: "📋", desc: "Developer Task System", defaultMode: "Native Telemetry" },
    ];

    return supportedKeys.map((item) => {
      const p = overviewPlatforms[item.key] || {};
      const isConnected = Boolean(p.connected || item.key === "pomodoro" || item.key === "tasks");
      const isActive = activeTodayList.includes(item.key) || Boolean(p.active_today);
      const username = p.username || (item.key === "github" ? ghUsername : null);

      let details = p.details || item.desc;
      if (item.key === "github" && isConnected) {
        details = `${repoCount} repos · ${commitCount} commits`;
      } else if (item.key === "pomodoro") {
        const sess = p.metrics?.today_completed_sessions ?? 0;
        details = `${sess} focus session${sess === 1 ? "" : "s"} today`;
      } else if (item.key === "tasks") {
        const comp = p.metrics?.completed_tasks ?? 0;
        const total = p.metrics?.total_tasks ?? 0;
        details = `${comp}/${total} tasks completed`;
      }

      return {
        key: item.key,
        name: p.name || item.name,
        icon: p.icon || item.icon,
        desc: item.desc,
        connected: isConnected,
        activeToday: isActive,
        username: username,
        details: details,
        connectionStatus: p.connection_status || (isConnected ? "Connected" : "Not Linked"),
        integrationType: p.integration_type || p.sync_mode || item.defaultMode,
        lastSyncStatus: p.last_sync_status || (isConnected ? "synced" : "idle"),
      };
    });
  }, [dashboardOverview, streak, ghUsername, repoCount, commitCount]);

  const activePlatformCount = platformsData.filter((p) => p.activeToday).length;
  const connectedPlatformCount = platformsData.filter((p) => p.connected).length;
  const todaySummary = dashboardOverview?.today_summary || {};

  return (
    <MainLayout>
      <div className="space-y-8 pb-12">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                Live Analytics & Metrics
              </span>
              {lastSyncTime && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last synced at {lastSyncTime}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              Developer Growth & Performance Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time telemetry, 365-day contribution calendar, language distribution, and multi-platform streak tracking.
            </p>
          </div>

          <button
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition shadow-xs cursor-pointer disabled:opacity-60 shrink-0"
          >
            <FaSyncAlt className={`text-blue-600 dark:text-blue-400 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Syncing Analytics..." : "Refresh Analytics"}</span>
          </button>
        </div>

        {/* ERROR NOTIFICATION */}
        {globalError && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-5 py-4 rounded-2xl flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <FaExclamationTriangle />
              {globalError}
            </span>
            <button
              onClick={() => loadAnalytics(true)}
              className="font-bold underline ml-4 cursor-pointer hover:text-rose-800 dark:hover:text-rose-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. DEVELOPER STREAK HIGHLIGHT HERO */}
        {streakLoading && !streak ? (
          <SkeletonCard className="h-56 bg-gradient-to-r from-orange-400/20 to-red-400/20" />
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-amber-600 to-red-600 text-white p-6 sm:p-9 shadow-xl border border-orange-400/30">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md text-orange-100 text-xs font-semibold border border-white/15">
                  <FaFire className="text-amber-300 animate-pulse" />
                  <span>Developer Streak Engine</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Active Developer Momentum
                </h2>

                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-md">
                    {currentStreak}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-orange-100">
                    Consecutive Days Active
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-orange-100/90 max-w-xl leading-relaxed">
                  Earned across active GitHub commits, task completions, and platform problem solving. 
                  {streak?.today_active ? " You have satisfied today's streak requirements! 🔥" : " Log an activity today to maintain your streak."}
                </p>
              </div>

              {/* Side Stats Container */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 bg-black/25 backdrop-blur-md rounded-2xl p-5 border border-white/15 min-w-[260px]">
                <div className="border-b sm:border-b-0 lg:border-b border-white/10 pb-3 sm:pb-0 lg:pb-3">
                  <p className="text-xs uppercase tracking-wider text-orange-200/80 font-semibold">
                    Longest Streak
                  </p>
                  <p className="text-2xl font-black text-white mt-1">
                    {longestStreak} <span className="text-sm font-semibold text-orange-200">days</span>
                  </p>
                </div>

                <div className="border-b sm:border-b-0 lg:border-b border-white/10 pb-3 sm:pb-0 lg:pb-3">
                  <p className="text-xs uppercase tracking-wider text-orange-200/80 font-semibold">
                    Total Active Days
                  </p>
                  <p className="text-2xl font-black text-white mt-1">
                    {totalActiveDays} <span className="text-sm font-semibold text-orange-200">days</span>
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-orange-200/80 font-semibold">
                    GitHub Streak
                  </p>
                  <p className="text-2xl font-black text-white mt-1">
                    {githubStreak} <span className="text-sm font-semibold text-orange-200">days</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. 365-DAY GITHUB CONTRIBUTION HEATMAP */}
        <ContributionHeatmap
          dailyContributions={dailyContributions}
          totalContributions={totalContributions}
          loading={contribLoading}
          error={contribError}
          connected={isGithubConnected}
          username={ghUsername}
          onRetry={() => loadAnalytics(true)}
        />

        {/* 3. GITHUB OVERVIEW & PERFORMANCE METRICS */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl p-6 sm:p-8 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                <FaGithub />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span>GitHub Verified Performance</span>
                  {ghUsername ? (
                    <a
                      href={`https://github.com/${ghUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 font-semibold inline-flex items-center gap-1 transition"
                    >
                      @{ghUsername} <FaExternalLinkAlt className="text-[10px]" />
                    </a>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      Account Not Linked
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Direct telemetry pulled from connected GitHub OAuth integration.
                </p>
              </div>
            </div>

            {isGithubConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Connected & Synchronized
              </span>
            ) : (
              <Link
                to="/settings?tab=connected"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition self-start sm:self-auto"
              >
                Connect GitHub in Settings →
              </Link>
            )}
          </div>

          {statsLoading && !githubStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} className="h-28" />
              ))}
            </div>
          ) : !isGithubConnected ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 opacity-75">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Repositories</span>
                <p className="text-xl font-bold text-slate-400 mt-2">—</p>
                <p className="text-xs text-slate-400 mt-1">Connect GitHub</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Commits</span>
                <p className="text-xl font-bold text-slate-400 mt-2">—</p>
                <p className="text-xs text-slate-400 mt-1">Connect GitHub</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Contributions</span>
                <p className="text-xl font-bold text-slate-400 mt-2">—</p>
                <p className="text-xs text-slate-400 mt-1">Connect GitHub</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Events</span>
                <p className="text-xl font-bold text-slate-400 mt-2">—</p>
                <p className="text-xs text-slate-400 mt-1">Connect GitHub</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Repositories
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {repoCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Public & accessible repos</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Commits
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                  {commitCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across verified branches</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Contributions
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                  {totalContributions}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Commits, PRs & Reviews</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Events
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                  {activeEventsCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recent Push & PR actions</p>
              </div>
            </div>
          )}
        </div>

        {/* 4. PROGRAMMING LANGUAGES & 30-DAY BAR CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Languages breakdown */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl p-6 sm:p-8 flex flex-col justify-between transition-colors duration-200">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shrink-0">
                    <FaCode />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Language Distribution
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Detected across your {repoCount} repositories ({languagesList.length} languages total).
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800/60 shrink-0">
                  {languagesList.length} Detected
                </span>
              </div>

              {langLoading && languagesList.length === 0 ? (
                <SkeletonCard className="h-64" />
              ) : languagesList.length > 0 ? (
                <div className="space-y-6">
                  <LanguageUsageChart languages={languagesList} />

                  <div className="space-y-3 pt-2">
                    {languagesList.slice(0, 5).map((lang, idx) => {
                      const colors = [
                        "bg-blue-600",
                        "bg-amber-500",
                        "bg-emerald-500",
                        "bg-purple-600",
                        "bg-rose-500",
                      ];
                      return (
                        <div key={lang.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                              {lang.name}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              {lang.percentage > 0 ? `${lang.percentage}%` : ""}
                              {lang.bytes > 0 && (
                                <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-1.5">
                                  ({(lang.bytes / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors[idx % colors.length]} transition-all duration-700`}
                              style={{ width: `${Math.max(4, lang.percentage)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  {isGithubConnected ? "No repository languages detected yet." : "Connect GitHub to detect repository languages."}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>
                Primary Stack: {languagesList.slice(0, 3).map((l) => l.name).join(", ") || "No languages recorded"}
              </span>
              <span>Source: GitHub API</span>
            </div>
          </div>

          {/* Right: Last 30 Days Bar Chart */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl p-6 sm:p-8 flex flex-col justify-between transition-colors duration-200">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
                    <FaChartLine />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      30-Day Activity Trend
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Daily contribution distribution across the last month.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/60 shrink-0">
                  {total30DayContributions} Contributions
                </span>
              </div>

              {contribLoading && recent30Days.length === 0 ? (
                <SkeletonCard className="h-64" />
              ) : recent30Days.length > 0 ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recent30Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                      <XAxis
                        dataKey="day"
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        interval={2}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<Custom30DayTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.1)", radius: 6 }} />
                      <Bar dataKey="contributions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  {isGithubConnected ? "No 30-day activity records available." : "Connect GitHub to view 30-day activity trend."}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
              <span>Updated daily from verified calendar</span>
              <span>Normalized ISO Dates</span>
            </div>
          </div>
        </div>

        {/* 5. TODAY'S TELEMETRY DOMAIN BREAKDOWN */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl p-6 sm:p-8 transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Activity Engine Telemetry Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Today's tracked hours and discrete actions across all developer domains.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base shrink-0">
                  <FaCode />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Coding & Repos</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Live development</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatDuration(todaySummary.coding_seconds)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {todaySummary.github_activities_today > 0
                    ? `${todaySummary.github_activities_today} GitHub action${todaySummary.github_activities_today > 1 ? "s" : ""} logged today`
                    : "Active coding time"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base shrink-0">
                  <FaGraduationCap />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Learning & Theory</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Coursera, NPTEL, FCC</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatDuration(todaySummary.learning_seconds)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Course modules & theory</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base shrink-0">
                  <FaBrain />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Problem Solving</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">LeetCode & GFG</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatDuration(todaySummary.problem_solving_seconds)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Algorithm practice</p>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-base shrink-0">
                  <FaClock />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Deep Focus</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pomodoro Sprints</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatDuration(todaySummary.focus_seconds)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {todaySummary.focus_seconds > 0 ? "Focus sessions recorded today" : "No active focus timer today"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. MULTI-PLATFORM ACTIVE STATUS GRID */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl p-6 sm:p-8 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Connected Platforms & Telemetry Synchronization
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real status derived from backend integration models and today's activity stream.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {activePlatformCount} Active Today
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {connectedPlatformCount} / {platformsData.length} Connected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformsData.map((platform) => {
              const isActive = platform.activeToday;
              const isConnected = platform.connected;
              const status = platform.connectionStatus;

              return (
                <div
                  key={platform.key}
                  className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between ${
                    isActive
                      ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-xs"
                      : isConnected
                      ? "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60"
                      : "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 opacity-70"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{platform.icon}</span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <FaCheckCircle className="text-[10px]" />
                          Active Today
                        </span>
                      ) : status === "Built-in Active" ? (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Built-in Active
                        </span>
                      ) : status === "Profile Linked" ? (
                        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          Profile Linked
                        </span>
                      ) : status === "Manual Tracking" ? (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          Manual Tracking
                        </span>
                      ) : isConnected ? (
                        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          Connected & Synced
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          Not Connected
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white mt-3 text-sm">
                      {platform.name}
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium truncate">
                      {platform.username ? `@${platform.username}` : platform.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">{platform.details}</span>
                    <span className="shrink-0 font-medium ml-2">
                      {status === "Manual Tracking" ? "Manual" : isConnected ? "✓ Synced" : "Not Linked"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Analytics;