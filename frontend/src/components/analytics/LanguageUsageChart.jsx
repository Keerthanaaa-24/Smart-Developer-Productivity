import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PALETTE = [
  "#3b82f6", // Python / Blue
  "#f59e0b", // JavaScript / Amber
  "#10b981", // C++ / Emerald
  "#8b5cf6", // CSS / Purple
  "#ef4444", // C / Rose
  "#06b6d4", // HTML / Cyan
  "#ec4899", // Java / Pink
  "#6366f1", // TypeScript / Indigo
  "#14b8a6", // Jupyter / Teal
  "#64748b", // Shell / Slate
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-slate-700">
        <p className="font-semibold text-slate-100">{data.name}</p>
        <p className="text-blue-400 font-bold mt-0.5">
          {data.percentage > 0 ? `${data.percentage}%` : `${data.value}%`}
        </p>
        {data.bytes > 0 && (
          <p className="text-[11px] text-slate-400">
            {(data.bytes / (1024 * 1024)).toFixed(2)} MB code
          </p>
        )}
      </div>
    );
  }
  return null;
};

const LanguageUsageChart = ({ languages = [] }) => {
  const chartData = useMemo(() => {
    if (!languages || languages.length === 0) return [];
    return languages.slice(0, 7).map((item) => ({
      name: item.language || item.name || "Unknown",
      value: Number(item.percentage || item.value || 0),
      bytes: Number(item.bytes || 0),
      percentage: Number(item.percentage || 0),
    }));
  }, [languages]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No language telemetry detected.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={3}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}-${index}`}
                fill={PALETTE[index % PALETTE.length]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LanguageUsageChart;