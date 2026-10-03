import { useMemo, useState } from "react";
import { FaCalendarAlt, FaFire, FaInfoCircle } from "react-icons/fa";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Generates color class based on contribution count
 */
const getCellColor = (count) => {
  if (!count || count === 0) return "bg-slate-800/80 border-slate-700/50 hover:border-slate-500";
  if (count <= 2) return "bg-emerald-950 border-emerald-800/80 text-emerald-300 hover:border-emerald-400";
  if (count <= 4) return "bg-emerald-700 border-emerald-600 text-emerald-100 hover:border-emerald-300";
  if (count <= 7) return "bg-emerald-500 border-emerald-400 text-white hover:border-emerald-200";
  return "bg-emerald-400 border-emerald-300 text-slate-900 font-bold hover:border-white";
};

const ContributionHeatmap = ({ dailyContributions = [], totalContributions = 0 }) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  // Group 365 days into weekly columns (Sunday to Saturday or Monday to Sunday)
  const { weeks, monthHeaders, totalCalculated } = useMemo(() => {
    if (!dailyContributions || dailyContributions.length === 0) {
      return { weeks: [], monthHeaders: [], totalCalculated: 0 };
    }

    let sum = 0;
    // Map existing days by YYYY-MM-DD
    const dayMap = {};
    dailyContributions.forEach((item) => {
      const d = item.date || item.day;
      const count = Number(item.count ?? item.contributions ?? 0);
      if (d) {
        dayMap[d] = count;
        sum += count;
      }
    });

    // Generate continuous 52-week array leading up to today
    const weeksArr = [];
    const headers = [];
    let lastMonth = -1;

    // Use last 364 days (52 weeks of 7 days)
    const today = new Date();
    // Normalize to end of day
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (52 * 7 - 1));

    let currentWeek = [];

    for (let i = 0; i < 52 * 7; i++) {
      const curDate = new Date(startDate);
      curDate.setDate(startDate.getDate() + i);
      const y = curDate.getFullYear();
      const m = String(curDate.getMonth() + 1).padStart(2, "0");
      const d = String(curDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const count = dayMap[dateStr] || 0;
      const dayOfWeek = curDate.getDay(); // 0 is Sunday
      const month = curDate.getMonth();

      // Check if start of month in first row of column
      if (dayOfWeek === 0 && month !== lastMonth && weeksArr.length < 50) {
        headers.push({ weekIndex: weeksArr.length, label: MONTH_NAMES[month] });
        lastMonth = month;
      }

      currentWeek.push({
        date: dateStr,
        count: count,
        dayOfWeek: dayOfWeek,
        formattedDate: curDate.toLocaleDateString(undefined, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      });

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    return {
      weeks: weeksArr,
      monthHeaders: headers,
      totalCalculated: sum || totalContributions || 0,
    };
  }, [dailyContributions, totalContributions]);

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shadow-inner">
            <FaCalendarAlt />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              GitHub Contribution Heatmap
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Last 365 Days
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified daily commits, pull requests, and repository activity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/60">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Total Contributions
            </p>
            <p className="text-2xl font-extrabold text-emerald-400">
              {totalCalculated || totalContributions || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2 relative z-10 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="min-w-[780px]">
          {/* Month labels row */}
          <div className="flex text-xs text-slate-400 mb-2 pl-8 h-5 relative">
            {monthHeaders.map((m, idx) => (
              <span
                key={idx}
                className="absolute"
                style={{ left: `${32 + m.weekIndex * 15}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid with Day-of-week labels */}
          <div className="flex gap-1">
            {/* Day Labels (Mon, Wed, Fri) */}
            <div className="flex flex-col justify-between text-[10px] text-slate-400 pr-2 w-7 py-0.5 h-[105px]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* 52 Columns */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-3 h-3 rounded-[3px] border transition-all cursor-pointer ${getCellColor(
                        day.count
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hover Info Banner & Legend */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400 relative z-10">
        {/* Tooltip detail */}
        <div className="h-5 flex items-center gap-2">
          {hoveredDay ? (
            <span className="text-slate-200 font-medium animate-fadeIn">
              <strong className="text-emerald-400">{hoveredDay.count}</strong>{" "}
              {hoveredDay.count === 1 ? "contribution" : "contributions"} on{" "}
              <span className="text-white">{hoveredDay.formattedDate}</span>
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1.5">
              <FaInfoCircle className="text-slate-400" />
              Hover over any square to view daily contribution telemetry.
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Less</span>
          <div className="w-3 h-3 rounded-[3px] bg-slate-800 border border-slate-700" />
          <div className="w-3 h-3 rounded-[3px] bg-emerald-950 border border-emerald-800" />
          <div className="w-3 h-3 rounded-[3px] bg-emerald-700 border border-emerald-600" />
          <div className="w-3 h-3 rounded-[3px] bg-emerald-500 border border-emerald-400" />
          <div className="w-3 h-3 rounded-[3px] bg-emerald-400 border border-emerald-300" />
          <span className="text-[11px] text-slate-400">More</span>
        </div>
      </div>
    </div>
  );
};

export default ContributionHeatmap;
