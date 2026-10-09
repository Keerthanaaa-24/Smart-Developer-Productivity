import React, { useState, useEffect } from "react";
import {
  FaChartLine,
  FaClock,
  FaTasks,
  FaGraduationCap,
  FaShieldAlt,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaCalendarAlt,
  FaLightbulb,
  FaRocket,
  FaCode,
  FaFolder,
} from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import careerImpactApi from "../api/careerImpactApi";

const CareerImpact = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await careerImpactApi.getCareerImpactReport();
        setReport(data);
      } catch (err) {
        console.error("Failed to load career impact report:", err);
        setError("Failed to generate Career Impact report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse max-w-7xl mx-auto pb-12">
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="lg:col-span-4 h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !report) {
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-2xl mx-auto">
            <FaShieldAlt />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Impact Report Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{error || "Insufficient telemetry data."}</p>
        </div>
      </MainLayout>
    );
  }

  const {
    period,
    focus_metrics,
    task_velocity,
    learning_and_coding,
    project_growth,
    career_readiness_evolution,
    skill_gap_summary,
    personalized_next_steps,
  } = report;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md shadow-blue-500/20 shrink-0">
              <FaChartLine />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Career Growth & Impact Report
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  30-Day Synthesis
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Data-driven evaluation of focus discipline, task execution velocity, and 5-pillar career readiness.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <FaCalendarAlt className="text-blue-500" />
            <span>
              {period.start_date} to {period.end_date} ({period.active_observation_days} active days)
            </span>
          </div>
        </div>

        {/* 4 PRIMARY IMPACT KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* FOCUS TIME */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <FaClock className="text-blue-500" /> 30-Day Focus Time
              </span>
              <span className={`flex items-center gap-0.5 ${focus_metrics.growth_percentage >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {focus_metrics.growth_percentage >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                {Math.abs(focus_metrics.growth_percentage)}%
              </span>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {focus_metrics.total_focus_hours_30d}
              </span>
              <span className="text-xs text-slate-500 font-bold">hours logged</span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Prior period: {focus_metrics.previous_period_hours} hrs
            </span>
          </div>

          {/* TASK VELOCITY */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <FaTasks className="text-emerald-500" /> Task Velocity
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {task_velocity.completion_rate_pct}% rate
              </span>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {task_velocity.tasks_completed_last_30d}
              </span>
              <span className="text-xs text-slate-500 font-bold">tasks delivered</span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {task_velocity.completed_tasks} of {task_velocity.total_tasks} all-time tasks
            </span>
          </div>

          {/* LEARNING & CODING EVENTS */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <FaCode className="text-purple-500" /> Engineering Events
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">90d Telemetry</span>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {learning_and_coding.total_activities_90d}
              </span>
              <span className="text-xs text-slate-500 font-bold">provenance events</span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              {learning_and_coding.coding_events_30d} code / {learning_and_coding.learning_events_30d} course events (30d)
            </span>
          </div>

          {/* CAREER READINESS DELTA */}
          <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <FaShieldAlt className="text-indigo-500" /> Career Readiness
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                +{career_readiness_evolution.delta} pts
              </span>
            </div>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {career_readiness_evolution.current_score}%
              </span>
              <span className="text-xs text-slate-500 font-bold">readiness index</span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Prior 30d baseline: {career_readiness_evolution.prior_30d_score}%
            </span>
          </div>
        </div>

        {/* MAIN ANALYSIS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* WEEKLY FOCUS TRENDS (8 COLS) */}
          <div className="lg:col-span-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <FaClock className="text-blue-500" /> 4-Week Deep Work Progression
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregated Pomodoro focus sprints and active IDE development duration
                </p>
              </div>
            </div>

            {/* BARS */}
            <div className="grid grid-cols-4 gap-4 pt-4">
              {focus_metrics.weekly_trends?.map((w, idx) => {
                const maxHours = Math.max(...focus_metrics.weekly_trends.map((t) => t.focus_hours), 10);
                const heightPct = Math.min(100, Math.max(15, Math.round((w.focus_hours / maxHours) * 100)));
                return (
                  <div key={idx} className="flex flex-col items-center gap-3">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {w.focus_hours}h
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-40 rounded-2xl flex flex-col justify-end p-1.5">
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-xl transition-all duration-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {w.week_label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {w.sessions_completed} sessions
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5-PILLAR BREAKDOWN */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                5-Pillar Career Readiness Scorecard
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(career_readiness_evolution.pillars || {}).map(([key, p]) => (
                  <div
                    key={key}
                    className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {p.name}
                      </span>
                      <span className="font-black text-purple-600 dark:text-purple-400">
                        {p.score}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                        style={{ width: `${p.score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Weight: {p.weight} • {p.observed_evidence?.length || 0} verified signal(s)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PERSONALIZED ACTIONABLE NEXT STEPS (4 COLS) */}
          <div className="lg:col-span-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FaLightbulb className="text-amber-500" /> High-Impact Next Steps
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Personalized engineering actions derived from your active skill gaps and career readiness deficits.
            </p>

            <div className="space-y-3 pt-2">
              {personalized_next_steps?.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        step.priority === "high"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {step.priority} Priority
                    </span>
                    <span className="text-[10px] text-slate-400">Est: {step.estimated_effort}</span>
                  </div>

                  <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {step.title}
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium block pt-1">
                    {step.evidence_reason}
                  </span>
                </div>
              ))}
            </div>

            {/* SUMMARY STATS */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span>Completed Projects:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {project_growth.completed_projects} / {project_growth.total_projects}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Recommendations Resolved:</span>
                <span className="font-bold text-emerald-600">
                  {skill_gap_summary.recommendations_completed} completed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CareerImpact;
