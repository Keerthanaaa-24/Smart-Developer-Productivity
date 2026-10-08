import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaBrain,
  FaRobot,
  FaClock,
  FaLightbulb,
  FaChartLine,
  FaSlidersH,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFire,
  FaInfoCircle,
  FaPlay,
  FaTasks,
  FaUndo,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { predictCustomProductivity, getMyProductivityPrediction } from "../../api/mlApi";

const DEFAULT_SIM_VALUES = {
  coding_minutes: 180,
  tasks_completed: 5,
  tasks_planned: 6,
  pomodoro_sessions: 4,
  pomodoro_minutes: 100,
  github_commits: 6,
  goal_completion_rate: 85,
  focus_score: 90,
  hour_of_day: 11,
  day_of_week: 2,
};

const MLProductivityCard = ({ mlData: initialData, onRefresh }) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState("");
  const [simResult, setSimResult] = useState(null);

  // Simulation Form State
  const [simValues, setSimValues] = useState(DEFAULT_SIM_VALUES);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleRefreshPrediction = async () => {
    setLoading(true);
    try {
      const fresh = await getMyProductivityPrediction();
      setData(fresh);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to refresh ML prediction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setSimulating(true);
    setSimError("");

    try {
      const codingMins = Math.max(0, Number(simValues.coding_minutes) || 0);
      const tasksDone = Math.max(0, Number(simValues.tasks_completed) || 0);
      const tasksPlan = Math.max(1, Number(simValues.tasks_planned) || 1);
      const pomMins = Math.max(0, Number(simValues.pomodoro_minutes) || 0);
      let pomSessions = Math.max(0, Number(simValues.pomodoro_sessions) || 0);
      if (pomSessions === 0 && pomMins > 0) {
        pomSessions = Math.max(1, Math.floor(pomMins / 25));
      }

      const commits = Math.max(0, Number(simValues.github_commits) || 0);
      let goalRate = Number(simValues.goal_completion_rate);
      if (isNaN(goalRate) || goalRate < 0) {
        goalRate = Math.min(100, Math.round((tasksDone / tasksPlan) * 100));
      }
      goalRate = Math.max(0, Math.min(100, goalRate));

      const focusScore = Math.max(0, Math.min(100, Number(simValues.focus_score) || 0));
      const hour = Math.max(0, Math.min(23, Number(simValues.hour_of_day) || 12));
      const day = Math.max(0, Math.min(6, Number(simValues.day_of_week) || 2));

      const payload = {
        coding_minutes: codingMins,
        tasks_completed: tasksDone,
        tasks_planned: tasksPlan,
        pomodoro_sessions: pomSessions,
        pomodoro_minutes: pomMins,
        github_commits: commits,
        goal_completion_rate: goalRate,
        focus_score: focusScore,
        hour_of_day: hour,
        day_of_week: day,
      };

      const result = await predictCustomProductivity(payload);

      if (result && (result.predicted_productivity_score !== undefined || result.status === "success")) {
        setSimResult(result);
        setData(result);
      } else {
        throw new Error("Invalid prediction response returned by model service.");
      }
    } catch (err) {
      console.error("Simulation error:", err);
      const message =
        err.response?.data?.detail ||
        err.friendlyMessage ||
        err.message ||
        "ML Simulator failed to generate prediction. Please ensure backend is running.";
      setSimError(message);
    } finally {
      setSimulating(false);
    }
  };

  const handleResetSimulator = () => {
    setSimValues(DEFAULT_SIM_VALUES);
    setSimError("");
  };

  const isInsufficient =
    data?.status === "insufficient_data" ||
    data?.predicted_productivity_score === null ||
    data?.predicted_productivity_score === undefined;

  const score = data?.predicted_productivity_score;
  const level = data?.productivity_level || (score >= 75 ? "High" : score >= 50 ? "Moderate" : "Needs Attention");
  const recommendation = data?.recommendation || "Log your daily coding time, tasks, and focus intervals to generate personalized recommendations.";
  const topFactors = data?.top_factors || [];
  const mostProductiveTime = data?.most_productive_time || "Morning Peak (09:00 AM - 12:00 PM)";
  const algorithm = data?.model_metadata?.algorithm || "RandomForestRegressor";

  // Level Styling Helper
  const getLevelStyles = (customLevel, customInsufficient) => {
    if (customInsufficient) {
      return {
        badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        scoreText: "text-slate-400",
        glow: "from-indigo-500/10 via-purple-500/5 to-transparent",
        icon: <FaInfoCircle className="text-indigo-400" />,
        ring: "border-slate-700/60 shadow-slate-900/50",
      };
    }
    if (customLevel === "High") {
      return {
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        scoreText: "text-emerald-400",
        glow: "from-emerald-500/20 via-teal-500/10 to-transparent",
        icon: <FaFire className="text-emerald-400" />,
        ring: "border-emerald-500/40 shadow-emerald-500/20",
      };
    } else if (customLevel === "Moderate") {
      return {
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        scoreText: "text-amber-400",
        glow: "from-amber-500/20 via-orange-500/10 to-transparent",
        icon: <FaChartLine className="text-amber-400" />,
        ring: "border-amber-500/40 shadow-amber-500/20",
      };
    } else {
      return {
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        scoreText: "text-rose-400",
        glow: "from-rose-500/20 via-pink-500/10 to-transparent",
        icon: <FaExclamationTriangle className="text-rose-400" />,
        ring: "border-rose-500/40 shadow-rose-500/20",
      };
    }
  };

  const styles = getLevelStyles(level, isInsufficient);

  return (
    <div className="bg-slate-900/90 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-500/30 relative overflow-hidden transition-all duration-300">
      {/* Ambient Glow */}
      <div
        className={`absolute -top-16 -right-16 w-80 h-80 bg-gradient-to-br ${styles.glow} rounded-full blur-3xl pointer-events-none`}
      />

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/10">
            <FaBrain className="text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                ML Productivity Intelligence
              </h2>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Supervised ML
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Trained {algorithm} • Feature-Engineered Regression Pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
          >
            <FaInfoCircle className="text-indigo-400 text-xs" />
            <span className="hidden sm:inline">How it Works</span>
            {showHowItWorks ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
          </button>

          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition shadow-sm cursor-pointer ${
              showSimulator
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white"
            }`}
          >
            <FaSlidersH className={showSimulator ? "text-white text-xs" : "text-indigo-400 text-xs"} />
            <span className="hidden sm:inline">
              {showSimulator ? "Close Simulator" : "ML Simulator"}
            </span>
          </button>

          <button
            onClick={handleRefreshPrediction}
            disabled={loading}
            className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Recalculate ML Prediction from Live Database"
          >
            <FaSyncAlt className={`text-xs ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* HOW IT WORKS EXPLAINABILITY CARD (Expandable) */}
      {showHowItWorks && (
        <div className="mt-5 p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-200 flex items-center gap-2">
              <FaInfoCircle /> How is your ML Productivity Score Calculated?
            </h3>
            <span className="text-[11px] text-indigo-300/80">4-Stage Pipeline</span>
          </div>

          <p className="text-slate-300 leading-relaxed">
            This score is predicted from your authenticated activity data using an empirical Random Forest regression model. It evaluates your balance between deep focus, active coding, and task execution:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="text-indigo-400 font-bold mb-1">1. User Activity</div>
              <p className="text-[11px] text-slate-400">
                IDE coding duration, Git commits, Pomodoro sessions, and completed tasks.
              </p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="text-indigo-400 font-bold mb-1">2. Feature Engineering</div>
              <p className="text-[11px] text-slate-400">
                17 features: task ratio, commit intensity, focus index, cyclical time transforms.
              </p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="text-indigo-400 font-bold mb-1">3. Random Forest Model</div>
              <p className="text-[11px] text-slate-400">
                Supervised regression ensemble evaluated across activity patterns.
              </p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="text-indigo-400 font-bold mb-1">4. Actionable Insights</div>
              <p className="text-[11px] text-slate-400">
                Continuous 0–100 score, peak flow window, and specific recommendations.
              </p>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-indigo-300/70 border-t border-indigo-500/20 flex items-center justify-between">
            <span>Model trained on synthetic development-activity baseline</span>
            <span>Refined as real user telemetry accumulates</span>
          </div>
        </div>
      )}

      {/* CORE DISPLAY */}
      {isInsufficient ? (
        /* INSUFFICIENT DATA STATE */
        <div className="mt-6 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-2xl shrink-0 mt-1">
              <FaBrain />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Awaiting Activity Data
                </span>
                <span className="text-xs text-slate-400">No score displayed</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Log activity to unlock your ML Productivity Score
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                The ML model requires at least one active coding session, completed task, or Pomodoro focus block to evaluate your productivity profile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
            <Link
              to="/pomodoro"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
            >
              <FaPlay className="text-[10px]" />
              <span>Start Pomodoro</span>
            </Link>
            <Link
              to="/tasks"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <FaTasks className="text-xs" />
              <span>Manage Tasks</span>
            </Link>
          </div>
        </div>
      ) : (
        /* ACTIVE PREDICTION DISPLAY */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
          {/* Left: Score Gauge & Level */}
          <div className="lg:col-span-5 bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex flex-col items-center text-center relative overflow-hidden">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              ML Predicted Score
            </span>

            <div className="relative my-2 flex items-center justify-center">
              <div
                className={`w-32 h-32 rounded-full border-4 ${styles.ring} bg-slate-900/90 flex flex-col items-center justify-center shadow-lg transition-all duration-300`}
              >
                <span className={`text-4xl font-black tracking-tight ${styles.scoreText}`}>
                  {score}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">out of 100</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${styles.badge}`}
              >
                {styles.icon}
                {level} Productivity
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/40 w-full flex items-center justify-center gap-2 text-xs text-slate-300">
              <FaClock className="text-indigo-400" />
              <span className="font-medium text-slate-300">Peak Window:</span>
              <span className="font-bold text-white">{mostProductiveTime}</span>
            </div>
          </div>

          {/* Right: Recommendation & Top Factors */}
          <div className="lg:col-span-7 space-y-4">
            {/* Recommendation Box */}
            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-800/60 p-4 rounded-2xl border border-indigo-500/20">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm shrink-0">
                  <FaLightbulb />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                    Personalized ML Recommendation
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-200 mt-1 font-medium">
                    {recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Predictive Factors */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Top Productivity Drivers
                </span>
                <span className="text-[11px] text-slate-400">Random Forest Feature Weights</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {topFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          factor.type === "positive"
                            ? "bg-emerald-400"
                            : factor.type === "warning"
                            ? "bg-amber-400"
                            : "bg-indigo-400"
                        }`}
                      />
                      <span className="font-semibold text-slate-200 truncate">{factor.factor}</span>
                    </div>
                    <span className="font-bold text-indigo-300 ml-2 whitespace-nowrap">
                      {factor.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE SIMULATOR PANEL */}
      {showSimulator && (
        <div className="mt-6 pt-5 border-t border-slate-800/80 bg-slate-950/70 p-5 sm:p-6 rounded-2xl border border-indigo-500/30 space-y-5 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FaSlidersH className="text-indigo-400 text-sm" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                Interactive ML Feature Simulator
              </h3>
            </div>
            <span className="text-[11px] text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
              Live RandomForest Inferences
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Customize developer activity metrics below and trigger the ML pipeline to simulate real-time productivity scores and recommendations.
          </p>

          {/* SIMULATION ERROR BANNER */}
          {simError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-rose-400 shrink-0" />
                <span>{simError}</span>
              </div>
              <button
                onClick={() => setSimError("")}
                className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* SIMULATION RESULT DISPLAY BOX */}
          {simResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-indigo-500/40 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <FaRobot className="text-indigo-400" />
                  Simulation Output
                </span>
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <FaCheckCircle className="text-xs" /> Calculated Successfully
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-4 bg-slate-900/90 p-4 rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Predicted Score
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-indigo-400 my-1">
                    {simResult.predicted_productivity_score}
                    <span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      getLevelStyles(simResult.productivity_level, false).badge
                    }`}
                  >
                    {simResult.productivity_level} Productivity
                  </span>
                </div>

                <div className="sm:col-span-8 space-y-2.5">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="font-bold text-amber-300 block mb-1">
                      💡 ML Recommendation:
                    </span>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {simResult.recommendation}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <FaClock className="text-indigo-400" /> Peak Window:{" "}
                      <strong className="text-slate-200">{simResult.most_productive_time}</strong>
                    </span>
                    <span className="text-indigo-300 font-medium">
                      Applied to dashboard view
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORM INPUTS */}
          <form onSubmit={handleRunSimulation} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Coding Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="720"
                  value={simValues.coding_minutes}
                  onChange={(e) =>
                    setSimValues({ ...simValues, coding_minutes: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Tasks Completed</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={simValues.tasks_completed}
                  onChange={(e) =>
                    setSimValues({ ...simValues, tasks_completed: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Tasks Planned</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={simValues.tasks_planned}
                  onChange={(e) =>
                    setSimValues({ ...simValues, tasks_planned: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Pomodoro Focus (mins)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={simValues.pomodoro_minutes}
                  onChange={(e) =>
                    setSimValues({ ...simValues, pomodoro_minutes: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Git Commits</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={simValues.github_commits}
                  onChange={(e) =>
                    setSimValues({ ...simValues, github_commits: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Focus Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={simValues.focus_score}
                  onChange={(e) =>
                    setSimValues({ ...simValues, focus_score: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Hour of Day (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={simValues.hour_of_day}
                  onChange={(e) =>
                    setSimValues({ ...simValues, hour_of_day: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Day of Week (0=Mon, 6=Sun)</label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={simValues.day_of_week}
                  onChange={(e) =>
                    setSimValues({ ...simValues, day_of_week: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetSimulator}
                disabled={simulating}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FaUndo className="text-xs" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="submit"
                disabled={simulating}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {simulating ? <FaSyncAlt className="animate-spin text-xs" /> : <FaRobot className="text-xs" />}
                <span>{simulating ? "Predicting with ML..." : "Run ML Predict"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FOOTER METRIC INFO */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <FaCheckCircle className="text-emerald-400 text-xs" /> Real-time Supervised Inference Engine
        </span>
        <span>Feature Vector: 17 inputs & cyclical encodings</span>
      </div>
    </div>
  );
};

export default MLProductivityCard;
