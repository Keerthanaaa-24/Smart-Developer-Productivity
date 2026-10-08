import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaFire,
  FaInfoCircle,
  FaGithub,
  FaExclamationTriangle,
  FaSyncAlt,
  FaArrowRight,
} from "react-icons/fa";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

const ContributionHeatmap = ({
  dailyContributions = [],
  totalContributions = 0,
  loading = false,
  error = "",
  connected = null, // true | false | null (loading)
  username = "",
  onRetry = () => {},
}) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  // Group 364 days into 52 continuous weekly columns
  const { weeks, monthHeaders, totalCalculated } = useMemo(() => {
    let sum = 0;
    const dayMap = {};

    if (Array.isArray(dailyContributions)) {
      dailyContributions.forEach((item) => {
        const d = item.date || item.day;
        const count = Number(item.count ?? item.contributions ?? 0);
        if (d) {
          dayMap[d] = count;
          sum += count;
        }
      });
    }

    const weeksArr = [];
    const headers = [];
    let lastMonth = -1;

    const today = new Date();
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
      const dayOfWeek = curDate.getDay();
      const month = curDate.getMonth();

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
    <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden transition-all duration-200">
      {/* Background glow effect */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shadow-inner shrink-0">
            <FaCalendarAlt />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>GitHub Contribution Heatmap</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Last 365 Days
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified daily commits, pull requests, and repository activity.
            </p>
          </div>
        </div>

        {/* Right Status Badge / Total Counter */}
        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/60 self-start sm:self-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FaSyncAlt className="animate-spin text-emerald-400" />
              <span>Syncing calendar...</span>
            </div>
          ) : connected === false ? (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</p>
              <p className="text-xs font-bold text-amber-400">Not Connected</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Total Contributions
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                {totalCalculated}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* STATE 1: LOADING SKELETON */}
      {loading && (
        <div className="relative z-10 py-6">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-4 animate-pulse">
            <FaSyncAlt className="animate-spin" />
            <span>Loading authentic 365-day contribution calendar from GitHub API...</span>
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            <div className="min-w-[760px] flex gap-1 animate-pulse">
              {Array.from({ length: 52 }).map((_, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, dIdx) => (
                    <div
                      key={dIdx}
                      className="w-3 h-3 rounded-[3px] bg-slate-800/80 border border-slate-700/50"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: NOT CONNECTED CALLOUT */}
      {!loading && connected === false && (
        <div className="relative z-10 py-8 px-6 bg-slate-800/60 border border-slate-700/80 rounded-2xl flex flex-col items-center text-center my-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-700/80 text-white flex items-center justify-center text-2xl mb-3 shadow-md">
            <FaGithub />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Connect Your GitHub Account
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mt-1.5 leading-relaxed">
            Link your GitHub profile in Settings to stream verified commits, repository stats, and interactive 365-day heatmap telemetry.
          </p>
          <Link
            to="/settings?tab=connected"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <span>Connect GitHub Account</span>
            <FaArrowRight className="text-[10px]" />
          </Link>
        </div>
      )}

      {/* STATE 3: ERROR STATE WITH RETRY */}
      {!loading && connected && error && (
        <div className="relative z-10 py-6 px-5 bg-rose-950/30 border border-rose-800/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 my-2">
          <div className="flex items-center gap-3 text-rose-300 text-xs sm:text-sm">
            <FaExclamationTriangle className="text-rose-400 text-lg shrink-0" />
            <span>{error || "Unable to load GitHub contributions calendar."}</span>
          </div>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md cursor-pointer shrink-0"
          >
            <FaSyncAlt className="text-xs" />
            <span>Retry Calendar</span>
          </button>
        </div>
      )}

      {/* STATE 4 & 5: VERIFIED HEATMAP (0 contributions or active contributions) */}
      {!loading && connected && !error && (
        <>
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

          {/* Connected note if 0 contributions */}
          {totalCalculated === 0 && (
            <div className="mt-3 text-xs text-slate-400 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
              Connected as <strong className="text-emerald-400">@{username || "user"}</strong>. No public contributions recorded in the last 365 days.
            </div>
          )}

          {/* Hover Info Banner & Legend */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400 relative z-10">
            {/* Tooltip detail */}
            <div className="h-5 flex items-center gap-2 min-w-0">
              {hoveredDay ? (
                <span className="text-slate-200 font-medium truncate">
                  <strong className="text-emerald-400">{hoveredDay.count}</strong>{" "}
                  {hoveredDay.count === 1 ? "contribution" : "contributions"} on{" "}
                  <span className="text-white">{hoveredDay.formattedDate}</span>
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1.5 truncate">
                  <FaInfoCircle className="text-slate-400 shrink-0" />
                  <span>Hover over any square to inspect daily telemetry.</span>
                </span>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400">Less</span>
              <div className="w-3 h-3 rounded-[3px] bg-slate-800 border border-slate-700" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-950 border border-emerald-800" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-700 border border-emerald-600" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-500 border border-emerald-400" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-400 border border-emerald-300" />
              <span className="text-[11px] text-slate-400">More</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContributionHeatmap;
