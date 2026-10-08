import React, { useState } from "react";
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
  FaCode,
  FaTasks,
} from "react-icons/fa";
import { predictCustomProductivity, getMyProductivityPrediction } from "../../api/mlApi";

const MLProductivityCard = ({ mlData: initialData, onRefresh }) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Simulation Form State
  const [simValues, setSimValues] = useState({
    coding_minutes: 180,
    tasks_completed: 4,
    tasks_planned: 5,
    pomodoro_sessions: 4,
    pomodoro_minutes: 100,
    github_commits: 5,
    goal_completion_rate: 80,
    focus_score: 85,
    hour_of_day: 11,
    day_of_week: 2,
  });

  // Keep internal state synced when props update
  React.useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleRefreshPrediction = async () => {
    setLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        const fresh = await getMyProductivityPrediction();
        setData(fresh);
      }
    } catch (err) {
      console.error("Failed to refresh ML prediction:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const result = await predictCustomProductivity({
        coding_minutes: Number(simValues.coding_minutes),
        tasks_completed: Number(simValues.tasks_completed),
        tasks_planned: Number(simValues.tasks_planned),
        pomodoro_sessions: Number(simValues.pomodoro_sessions),
        pomodoro_minutes: Number(simValues.pomodoro_minutes),
        github_commits: Number(simValues.github_commits),
        goal_completion_rate: Number(simValues.goal_completion_rate),
        focus_score: Number(simValues.focus_score),
        hour_of_day: Number(simValues.hour_of_day),
        day_of_week: Number(simValues.day_of_week),
      });
      setData(result);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  const score = data?.predicted_productivity_score ?? 0;
  const level = data?.productivity_level || (score >= 75 ? "High" : score >= 50 ? "Moderate" : "Needs Attention");
  const recommendation = data?.recommendation || "Maintain consistent coding blocks and active task tracking to maximize ML productivity rating.";
  const topFactors = data?.top_factors || [];
  const mostProductiveTime = data?.most_productive_time || "Morning Peak (09:00 AM - 12:00 PM)";
  const algorithm = data?.model_metadata?.algorithm || "RandomForestRegressor";
  const r2Score = data?.model_metadata?.r2_score || 0.98;

  // Level Styling
  const getLevelStyles = () => {
    if (level === "High") {
      return {
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        scoreText: "text-emerald-400",
        glow: "from-emerald-500/20 via-teal-500/10 to-transparent",
        icon: <FaFire className="text-emerald-400" />,
        ring: "border-emerald-500/40 shadow-emerald-500/20",
      };
    } else if (level === "Moderate") {
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

  const styles = getLevelStyles();

  return (
    <div className="bg-slate-900/90 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-500/30 relative overflow-hidden transition-all duration-300">
      {/* Dynamic Ambient Background Glow */}
      <div
        className={`absolute -top-16 -right-16 w-80 h-80 bg-gradient-to-br ${styles.glow} rounded-full blur-3xl pointer-events-none`}
      />

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/10">
            <FaBrain className="animate-pulse text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                ML Predicted Productivity
              </h2>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Supervised ML
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Trained {algorithm} • R² {r2Score} accuracy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Simulate custom activity features"
          >
            <FaSlidersH className="text-indigo-400 text-xs" />
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

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        {/* Left: Score Gauge & Level */}
        <div className="lg:col-span-5 bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 flex flex-col items-center text-center relative overflow-hidden">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Predicted Productivity Score
          </span>

          <div className="relative my-2 flex items-center justify-center">
            {/* Circular Ring Glow */}
            <div
              className={`w-32 h-32 rounded-full border-4 ${styles.ring} bg-slate-900/90 flex flex-col items-center justify-center shadow-lg`}
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
              {topFactors.length > 0 ? (
                topFactors.map((factor, idx) => (
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
                ))
              ) : (
                <>
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Active Development Time</span>
                    <span className="font-bold text-emerald-400">High Weight</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Task Execution Ratio</span>
                    <span className="font-bold text-indigo-400">Key Signal</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE SIMULATOR PANEL */}
      {showSimulator && (
        <form
          onSubmit={handleRunSimulation}
          className="mt-6 pt-5 border-t border-slate-800/80 bg-slate-950/60 p-5 rounded-2xl border border-indigo-500/20 space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaSlidersH className="text-indigo-400 text-sm" />
              <h3 className="text-sm font-bold text-white">
                Interactive ML Feature Simulator
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Adjust features to test RandomForest predictions in real-time
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Coding Minutes</label>
              <input
                type="number"
                min="0"
                max="600"
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

            <div className="flex items-end">
              <button
                type="submit"
                disabled={simulating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {simulating ? <FaSyncAlt className="animate-spin" /> : <FaRobot />}
                <span>{simulating ? "Predicting..." : "Run ML Predict"}</span>
              </button>
            </div>
          </div>
        </form>
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
