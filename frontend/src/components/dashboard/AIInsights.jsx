import { FaRobot, FaLightbulb, FaCheckCircle } from "react-icons/fa";

const AIInsights = ({ insights = [] }) => {
  const isFallbackOnly =
    insights.length === 1 &&
    insights[0].toLowerCase().includes("not enough activity data");

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-500/20 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center text-xl shadow-inner">
              <FaRobot className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                AI Productivity Coach
              </h2>
              <p className="text-xs text-indigo-200/70 mt-0.5">
                Real-time recommendations powered by your telemetry.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
            Smart Engine
          </span>
        </div>

        <div className="space-y-3">
          {insights.map((item, index) => (
            <div
              key={index}
              className={`p-3.5 rounded-xl border transition ${
                isFallbackOnly
                  ? "bg-white/5 border-white/10 text-slate-300"
                  : index === 0
                  ? "bg-indigo-500/15 border-indigo-400/30 text-indigo-100"
                  : "bg-white/5 border-white/10 text-slate-200"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0 text-indigo-400 text-xs">
                  {isFallbackOnly ? <FaLightbulb /> : <FaCheckCircle className="text-emerald-400" />}
                </div>
                <p className="text-xs leading-relaxed font-normal">
                  {item}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-200/60">
        <span>Tailored to your active workflows</span>
        <span>Real Telemetry Only</span>
      </div>
    </div>
  );
};

export default AIInsights;