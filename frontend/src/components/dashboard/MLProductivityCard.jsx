import React, { useState, useEffect, useCallback } from "react";
import {
  FaBrain,
  FaChartLine,
  FaBriefcase,
  FaSearchPlus,
  FaLightbulb,
  FaShieldAlt,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaArrowRight,
  FaInfoCircle,
  FaPlay,
  FaLock,
  FaCheck,
  FaExternalLinkAlt,
} from "react-icons/fa";
import mlApi from "../../api/mlApi";

const MLProductivityCard = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState("forecast"); // "forecast" | "career" | "skill_gaps" | "recommendations" | "readiness"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Feature Data States
  const [forecastData, setForecastData] = useState(null);
  const [careerData, setCareerData] = useState(null);
  const [skillGapData, setSkillGapData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [readinessData, setReadinessData] = useState(null);

  // Skill Gap Form
  const [selectedRole, setSelectedRole] = useState("full_stack");
  const [customJobDescription, setCustomJobDescription] = useState("");
  const [analyzingSkillGap, setAnalyzingSkillGap] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchAllMLData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [fc, cr, sg, recs, rd] = await Promise.allSettled([
        mlApi.getProductivityForecast(),
        mlApi.getCareerReadiness(),
        mlApi.getSkillGapsOverview(),
        mlApi.getRecommendations(),
        mlApi.getDatasetReadiness(),
      ]);

      if (fc.status === "fulfilled") setForecastData(fc.value);
      if (cr.status === "fulfilled") setCareerData(cr.value);
      if (sg.status === "fulfilled") setSkillGapData(sg.value);
      if (recs.status === "fulfilled") setRecommendations(recs.value.recommendations || []);
      if (rd.status === "fulfilled") setReadinessData(rd.value);
    } catch (err) {
      console.warn("ML intelligence data fetch warning:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMLData();
  }, [fetchAllMLData]);

  const handleRunSkillGap = async (e) => {
    if (e) e.preventDefault();
    setAnalyzingSkillGap(true);
    try {
      const res = await mlApi.analyzeSkillGaps({
        target_role: selectedRole,
        job_description: customJobDescription.trim() || undefined,
      });
      setSkillGapData((prev) => ({
        ...prev,
        latest_analysis: res,
      }));
      setToast({ type: "success", message: `Skill gap analysis completed for ${res.target_role}!` });
    } catch (err) {
      setToast({ type: "error", message: "Failed to run skill gap analysis." });
    } finally {
      setAnalyzingSkillGap(false);
    }
  };

  const handleCompleteRecommendation = async (id) => {
    try {
      await mlApi.completeRecommendation(id);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_completed: true } : r))
      );
      setToast({ type: "success", message: "Marked recommendation as completed! Great progress." });
    } catch {
      setToast({ type: "error", message: "Failed to update recommendation status." });
    }
  };

  const handleDismissRecommendation = async (id) => {
    try {
      await mlApi.dismissRecommendation(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
      setToast({ type: "warning", message: "Recommendation dismissed." });
    } catch {
      setToast({ type: "error", message: "Failed to dismiss recommendation." });
    }
  };

  if (loading && !forecastData && !careerData) {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  const forecast = forecastData?.targets || {};
  const forecastFactors = forecastData?.contributing_factors || [];
  const careerPillars = careerData?.pillars || {};
  const latestGap = skillGapData?.latest_analysis;
  const roleTemplates = skillGapData?.role_templates || [];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/95 via-slate-50/90 to-purple-50/25 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-indigo-950/25 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg shadow-sm">
              <FaBrain />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Machine Learning & Developer Intelligence
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                  Phase 3 Live
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Explainable 7-day productivity forecasts, evidence-backed career readiness, and job skill-gap analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium">
            {[
              { id: "forecast", label: "7-Day Forecast", icon: <FaChartLine /> },
              { id: "career", label: "Career Readiness", icon: <FaBriefcase /> },
              { id: "skill_gaps", label: "Skill-Gap Analysis", icon: <FaSearchPlus /> },
              { id: "recommendations", label: "Actions", icon: <FaLightbulb /> },
              { id: "readiness", label: "ML Audit", icon: <FaShieldAlt /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all duration-200 font-semibold cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="text-[11px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAllMLData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs transition cursor-pointer disabled:opacity-50"
            title="Refresh Intelligence"
          >
            <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="mb-5">
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-sm ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : toast.type === "warning"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: 7-DAY PRODUCTIVITY FORECASTING */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          {forecastData?.status === "insufficient_data" ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <FaInfoCircle className="text-2xl text-purple-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Insufficient Historical Data for Reliable Forecast
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {forecastData.message}
              </p>
            </div>
          ) : (
            <>
              {/* Forecast Metrics Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Focus Time Forecast */}
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Expected Focus / Coding
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      7-Day Horizon
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {forecast.focus_time?.predicted_value_formatted || "0h 0m"}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>95% Range: {forecast.focus_time?.uncertainty_interval?.lower_bound_minutes}m – {forecast.focus_time?.uncertainty_interval?.upper_bound_minutes}m</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {forecast.focus_time?.baseline_comparison?.delta_percentage > 0 ? "+" : ""}
                      {forecast.focus_time?.baseline_comparison?.delta_percentage}% vs 7d avg
                    </span>
                  </div>
                </div>

                {/* Tasks Forecast */}
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Expected Tasks Completed
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Velocity Model
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {forecast.tasks_completion?.predicted_value_tasks || 0} tasks
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    Range: {forecast.tasks_completion?.uncertainty_interval?.lower_bound_tasks} – {forecast.tasks_completion?.uncertainty_interval?.upper_bound_tasks} tasks over next 7 days
                  </div>
                </div>

                {/* Goal Probability */}
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Weekly Goal Probability
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      forecast.weekly_goal_achievement?.status_color === "emerald"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}>
                      {forecast.weekly_goal_achievement?.status_label}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {forecast.weekly_goal_achievement?.probability_percentage || "0%"}
                  </div>
                  <div className="w-full bg-slate-200/70 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2.5">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: forecast.weekly_goal_achievement?.probability_percentage || "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Contributing Factors Explanation */}
              <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                  Key Contributing Drivers (Explainable Feature Importance)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {forecastFactors.map((factor, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">{factor.factor}</span>
                        <span className={`font-bold ${factor.type === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {factor.impact}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: CAREER READINESS ASSESSMENT */}
      {activeTab === "career" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-900/90 to-indigo-900/90 text-white shadow-md">
            <div>
              <span className="text-xs font-semibold text-purple-200 uppercase tracking-wider block">
                Evidence-Based Technical Readiness Index
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-black">{careerData?.overall_readiness_index || 0}%</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 uppercase tracking-wider">
                  {careerData?.tier_label || "Developing"}
                </span>
              </div>
            </div>
            <div className="text-xs text-purple-200 max-w-sm leading-relaxed">
              Transparent multi-pillar index evaluating verified code commits, algorithm completions, and projects.
            </div>
          </div>

          {/* 5 Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(careerPillars).map(([key, p]) => (
              <div
                key={key}
                className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h4>
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400">{p.score}%</span>
                  </div>

                  {/* Observed Evidence Tags */}
                  <div className="space-y-1 mb-3">
                    {p.observed_evidence?.map((ev, i) => (
                      <div key={i} className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <FaCheckCircle className="text-[10px] shrink-0" />
                        <span className="truncate">{ev}</span>
                      </div>
                    ))}
                  </div>

                  {/* Missing Gaps */}
                  {p.missing_evidence?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                      {p.missing_evidence.map((gap, i) => (
                        <div key={i} className="text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-1">
                          <span className="shrink-0">⚠️</span>
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-full bg-slate-200/70 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-purple-600 dark:bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INTELLIGENT SKILL-GAP ANALYSIS */}
      {activeTab === "skill_gaps" && (
        <div className="space-y-6">
          {/* Controls Form */}
          <form onSubmit={handleRunSkillGap} className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Target Role Blueprint:
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  {roleTemplates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Or Paste Custom Job Description Requirements:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Seeking Python backend engineer with FastAPI, Docker, SQL, and Redis..."
                    value={customJobDescription}
                    onChange={(e) => setCustomJobDescription(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={analyzingSkillGap}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {analyzingSkillGap ? "Analyzing..." : "Analyze"}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Analysis Results Display */}
          {latestGap && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Target: {latestGap.target_role}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {latestGap.match_summary?.matched_count} matched · {latestGap.match_summary?.missing_count} gaps identified
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {latestGap.match_percentage}% Match
                  </span>
                </div>
              </div>

              {/* Matched vs Missing Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched Skills */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-emerald-500/20">
                  <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <FaCheckCircle /> Demonstrated Evidence ({latestGap.matched_skills?.length || 0})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {latestGap.matched_skills?.map((s) => (
                      <span
                        key={s.skill_key}
                        className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        title={s.evidence?.join(", ")}
                      >
                        ✓ {s.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Skills & Bridging Tasks */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-amber-500/20">
                  <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <FaExclamationTriangle /> Missing Technical Gaps ({latestGap.missing_skills?.length || 0})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {latestGap.missing_skills?.map((s) => (
                      <span
                        key={s.skill_key}
                        className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      >
                        ○ {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PERSONALIZED RECOMMENDATIONS */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Data-Driven Recommended Actions
            </h4>
            <span className="text-xs text-slate-500">{recommendations.length} active suggestion(s)</span>
          </div>

          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    rec.is_completed
                      ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                      : "bg-white/80 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/70 shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        rec.priority === "high"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : rec.priority === "medium"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}>
                        {rec.priority} Priority
                      </span>
                      <span className="text-[11px] text-slate-500">Est: {rec.estimated_effort}</span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{rec.title}</h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {rec.description}
                    </p>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1.5 font-medium">
                      Triggered by: {rec.evidence_reason}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    {!rec.is_completed && (
                      <button
                        onClick={() => handleCompleteRecommendation(rec.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <FaCheck className="text-[10px]" /> Mark Done
                      </button>
                    )}
                    <button
                      onClick={() => handleDismissRecommendation(rec.id)}
                      className="px-2.5 py-1 text-slate-400 hover:text-slate-600 text-[11px] rounded-lg transition cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No pending recommendations. All actions up to date!
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DATASET ML READINESS AUDIT */}
      {activeTab === "readiness" && readinessData && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Model Training & Inference Readiness
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {readinessData.readiness_summary}
              </p>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-xl border self-start sm:self-auto ${
              readinessData.is_sufficient_for_forecasting
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300"
            }`}>
              {readinessData.readiness_status.toUpperCase()}
            </span>
          </div>

          {/* Feature Coverage Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(readinessData.feature_coverage || {}).map(([key, c]) => (
              <div key={key} className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white mt-1 block">
                  {c.coverage_pct}% coverage
                </span>
                <span className="text-[10px] text-slate-500">
                  {c.available_observations ?? c.available_integrations} observations recorded
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MLProductivityCard;
