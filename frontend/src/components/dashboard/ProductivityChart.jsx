import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { FaChartLine } from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-700">
        <p className="font-semibold text-slate-200">{label} ({data.date || "Day"})</p>
        <p className="text-blue-400 font-bold mt-1">
          {data.activities} {data.activities === 1 ? "activity" : "activities"}
        </p>
      </div>
    );
  }
  return null;
};

const ProductivityChart = ({ weeklyData = [] }) => {
  const { isDark } = useTheme();

  const totalWeeklyActivities = useMemo(() => {
    return weeklyData.reduce((sum, item) => sum + (item.activities || 0), 0);
  }, [weeklyData]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shadow-xs">
            <FaChartLine />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              7-Day Productivity Trend
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily verified activity records across the last week.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 font-medium">7-Day Total</span>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight">
            {totalWeeklyActivities} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">acts</span>
          </p>
        </div>
      </div>

      <div className="h-[260px] w-full mt-2">
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? "#1e293b" : "#f1f5f9"}
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: isDark ? "#334155" : "#e2e8f0" }}
                tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: isDark ? "#64748b" : "#94a3b8", fontSize: 11 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc", radius: 8 }}
              />
              <Bar
                dataKey="activities"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No activity trend data available yet.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Historical breakdown</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {totalWeeklyActivities > 0 ? "Consistent weekly output" : "Start today to build history"}
        </span>
      </div>
    </div>
  );
};

export default ProductivityChart;