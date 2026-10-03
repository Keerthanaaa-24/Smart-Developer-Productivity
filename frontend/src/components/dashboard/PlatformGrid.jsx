import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaPlug,
  FaSyncAlt,
  FaCheckCircle,
  FaExternalLinkAlt,
  FaCog,
  FaCode,
  FaTerminal,
  FaLaptopCode,
  FaGraduationCap,
  FaBriefcase,
  FaClock,
  FaInfoCircle,
} from "react-icons/fa";
import API from "../../api/axios";

const CATEGORY_MAP = {
  all: "All Ecosystem",
  coding: "Coding & IDE",
  problem_solving: "Problem Solving",
  learning: "Learning",
  focus: "Deep Work",
  productivity: "Tasks",
  career: "Career",
};

const PlatformGrid = ({ platforms = {} }) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const platformList = useMemo(() => {
    return Object.entries(platforms).map(([key, data]) => ({
      key,
      name: data.name || key,
      icon: data.icon || "⚡",
      category: data.category || "coding",
      integrationType: data.integration_type || data.sync_mode || "Manual",
      connectionStatus: data.connection_status || (data.connected ? "Connected" : "Not Linked"),
      connected: Boolean(data.connected),
      activeToday: Boolean(data.active_today),
      username: data.username,
      profileUrl: data.profile_url,
      todayActions: data.today_actions || 0,
      lastSyncAt: data.last_sync_at,
      lastSyncStatus: data.last_sync_status || "idle",
      metrics: data.metrics || {},
      details: data.details || "",
    }));
  }, [platforms]);

  // Derived counts
  const summary = useMemo(() => {
    const oauthConnected = platformList.filter(
      (p) => p.integrationType.includes("OAuth") || p.connectionStatus === "Connected" || p.connectionStatus === "Built-in Active"
    ).length;
    const profileLinkedOrManual = platformList.filter(
      (p) => p.connectionStatus === "Profile Linked" || p.connectionStatus === "Manual Tracking"
    ).length;
    const activeToday = platformList.filter((p) => p.activeToday).length;
    return { oauthConnected, profileLinkedOrManual, activeToday, total: platformList.length };
  }, [platformList]);

  const filteredList = useMemo(() => {
    if (selectedCategory === "all") return platformList;
    if (selectedCategory === "career") {
      return platformList.filter((p) => p.category === "career" || p.category === "focus" || p.category === "productivity");
    }
    return platformList.filter((p) => p.category === selectedCategory);
  }, [platformList, selectedCategory]);

  const showFeedback = (msg, type = "success") => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await API.post("/activity/sync");
      showFeedback(
        res.data?.message || `Ecosystem synchronization completed (${res.data?.total_new_activities || 0} new activities recorded).`
      );
    } catch (err) {
      console.error("Sync all error:", err);
      showFeedback("Sync failed. Check connection or provider limits.", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncSingle = async (platformKey, platformName) => {
    setSyncingPlatform(platformKey);
    try {
      const res = await API.post(`/activity/sync/${platformKey}`);
      if (res.data?.status === "error") {
        showFeedback(`${platformName}: ${res.data.message || "Sync failed."}`, "error");
      } else {
        showFeedback(res.data?.message || `${platformName} synchronized successfully!`);
      }
    } catch (err) {
      console.error(`Sync single ${platformKey} error:`, err);
      showFeedback(`Failed to sync ${platformName}.`, "error");
    } finally {
      setSyncingPlatform(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Connected":
      case "Built-in Active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Profile Linked":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "Manual Tracking":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-lg shadow-md shadow-blue-500/20 shrink-0">
            <FaPlug />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Developer Integration Center
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <FaCheckCircle className="text-[9px]" /> All Systems Operational
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage your connected developer ecosystem and verified activity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition cursor-pointer disabled:opacity-60"
          >
            <FaSyncAlt className={`text-xs ${syncingAll ? "animate-spin" : ""}`} />
            <span>{syncingAll ? "Syncing..." : "Sync All"}</span>
          </button>
          <Link
            to="/settings"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Manage Connected Accounts in Settings"
          >
            <FaCog />
          </Link>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            feedback.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          <FaInfoCircle className="shrink-0" />
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* 3 Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              1. API / OAuth Connected
            </span>
            <p className="text-xl font-black text-emerald-400 mt-0.5">
              {summary.oauthConnected} <span className="text-xs text-slate-500 font-normal">platforms</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm border border-emerald-500/20">
            <FaCheckCircle />
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              2. Profile Linked / Manual
            </span>
            <p className="text-xl font-black text-blue-400 mt-0.5">
              {summary.profileLinkedOrManual} <span className="text-xs text-slate-500 font-normal">platforms</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm border border-blue-500/20">
            <FaLaptopCode />
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              3. Active Today
            </span>
            <p className="text-xl font-black text-indigo-400 mt-0.5">
              {summary.activeToday} <span className="text-xs text-slate-500 font-normal">/ {summary.total} verified</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm border border-indigo-500/20">
            <FaPlug />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "coding", "problem_solving", "learning", "career"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              selectedCategory === cat
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {CATEGORY_MAP[cat] || cat}
          </button>
        ))}
      </div>

      {/* Individual Platform Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredList.map((p) => {
          const isSyncing = syncingPlatform === p.key;

          return (
            <div
              key={p.key}
              className={`rounded-2xl border p-4 transition flex flex-col justify-between group relative ${
                p.activeToday
                  ? "bg-slate-800/90 border-blue-500/40 shadow-lg"
                  : p.connected
                  ? "bg-slate-800/50 border-slate-700/80"
                  : "bg-slate-850/40 border-slate-800/60 opacity-80"
              }`}
            >
              <div>
                {/* Card Top: Icon, Name & Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl shrink-0">{p.icon}</span>
                    <div>
                      <h4 className="font-bold text-white text-xs tracking-tight">
                        {p.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {p.integrationType}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      p.connectionStatus
                    )}`}
                  >
                    {p.connectionStatus}
                  </span>
                </div>

                {/* Handle & Profile Link */}
                <div className="text-xs text-slate-300 font-medium truncate mt-1">
                  {p.username ? (
                    p.profileUrl ? (
                      <a
                        href={p.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition"
                      >
                        <span>@{p.username}</span>
                        <FaExternalLinkAlt className="text-[9px]" />
                      </a>
                    ) : (
                      <span className="text-slate-300">@{p.username}</span>
                    )
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">No handle configured</span>
                  )}
                </div>

                {/* Verified Metric Pill */}
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                  {p.metrics.public_repos !== undefined && (
                    <span className="bg-slate-900/80 text-blue-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {p.metrics.public_repos} Repos · {p.metrics.total_commits || 0} Commits
                    </span>
                  )}
                  {p.metrics.problems_solved !== undefined && (
                    <span className="bg-slate-900/80 text-amber-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {p.metrics.problems_solved} Solved
                    </span>
                  )}
                  {p.metrics.coding_score !== undefined && (
                    <span className="bg-slate-900/80 text-emerald-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      Score: {p.metrics.coding_score} · {p.metrics.problems_solved || 0} Solved
                    </span>
                  )}
                  {p.metrics.certifications !== undefined && (
                    <span className="bg-slate-900/80 text-purple-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {p.metrics.certifications} Certs · {p.metrics.points || 0} Pts
                    </span>
                  )}
                  {p.metrics.today_focus_minutes !== undefined && (
                    <span className="bg-slate-900/80 text-cyan-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {p.metrics.today_completed_sessions || 0} Sessions · {p.metrics.today_focus_minutes}m Focus
                    </span>
                  )}
                  {p.metrics.completed_tasks !== undefined && (
                    <span className="bg-slate-900/80 text-emerald-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {p.metrics.completed_tasks}/{p.metrics.total_tasks || 0} Tasks ({p.metrics.completion_rate}%)
                    </span>
                  )}
                  {p.metrics.applications_tracked !== undefined && (
                    <span className="bg-slate-900/80 text-indigo-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {p.metrics.applications_tracked} Applications Tracked
                    </span>
                  )}
                  {p.metrics.active_coding_minutes !== undefined && (
                    <span className="bg-slate-900/80 text-blue-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {p.metrics.active_coding_minutes}m Coding · {p.metrics.active_sessions || 0} Sessions
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer: Actions */}
              <div className="mt-4 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">
                  {p.todayActions > 0 ? (
                    <span className="text-emerald-400 font-semibold">
                      ● {p.todayActions} action{p.todayActions > 1 ? "s" : ""} today
                    </span>
                  ) : (
                    <span>No activity today</span>
                  )}
                </span>

                {p.integrationType.includes("OAuth") || p.integrationType.includes("Public") ? (
                  <button
                    onClick={() => handleSyncSingle(p.key, p.name)}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded-lg hover:bg-slate-700/50 transition cursor-pointer disabled:opacity-50"
                  >
                    <FaSyncAlt className={`text-[10px] ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                  </button>
                ) : p.key === "pomodoro" ? (
                  <Link
                    to="/pomodoro"
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Open Timer →
                  </Link>
                ) : p.key === "tasks" ? (
                  <Link
                    to="/tasks"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    Open Tasks →
                  </Link>
                ) : (
                  <Link
                    to="/settings"
                    className="text-slate-400 hover:text-white"
                  >
                    Configure →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformGrid;

