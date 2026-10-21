import { useEffect, useState, useCallback } from "react";
import {
  FaChartLine,
  FaUsers,
  FaTrophy,
  FaTasks,
  FaClock,
  FaCertificate,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserSlash,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import AdminLayout from "../../layouts/AdminLayout";
import { getAdminAnalyticsOverview } from "../../api/adminApi";
import { useTheme } from "../../context/ThemeContext";

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminAnalyticsOverview();
      setData(res);
    } catch (err) {
      console.error("Failed to load platform analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Platform Analytics & Aggregates</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Authentic aggregated metrics across registered students, achievements, tasks, and point economy.
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
            Live Verified Database Data
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Aggregating platform metrics from database tables...
          </div>
        ) : data ? (
          <>
            {/* KPI STATS ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Registered Students
                </span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {data.students.total_registered}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {data.students.active_7d} active
                  </span>
                  <span>/ 7 days</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Verified Achievements
                </span>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {data.achievements.verified}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <span className="font-bold text-amber-500">
                    {data.achievements.pending} pending
                  </span>
                  <span>review</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tasks Completed
                </span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {data.productivity.completed_tasks}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {data.productivity.task_completion_rate}%
                  </span>
                  <span>completion rate</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Points Distributed
                </span>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {data.points_economy.total_points_distributed}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <span>Avg:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {data.points_economy.average_points_per_student} pts
                  </span>
                  <span>/ student</span>
                </div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 14-DAY ACTIVITY TREND */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      14-Day Platform Engagement & Active Users
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Daily authentic unique student logins
                    </p>
                  </div>
                </div>

                <div className="h-64 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trend_14d}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#334155" : "#e2e8f0"}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={isDark ? "#94a3b8" : "#64748b"}
                        fontSize={10}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis
                        stroke={isDark ? "#94a3b8" : "#64748b"}
                        fontSize={10}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#0f172a" : "#ffffff",
                          borderColor: isDark ? "#334155" : "#e2e8f0",
                          borderRadius: "1rem",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="active_students"
                        name="Active Students"
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ACHIEVEMENT CATEGORIES BREAKDOWN */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Achievement Category Mix
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Distribution of student accomplishment credentials
                  </p>

                  <div className="h-56 mt-4 w-full">
                    {data.achievements.categories.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No achievement category records yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.achievements.categories}
                            dataKey="count"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={45}
                            paddingAngle={3}
                          >
                            {data.achievements.categories.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? "#0f172a" : "#ffffff",
                              borderColor: isDark ? "#334155" : "#e2e8f0",
                              borderRadius: "1rem",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  {data.achievements.categories.length === 0 ? (
                    <p className="text-slate-400 italic text-[11px] py-2 text-center">
                      No category records logged yet.
                    </p>
                  ) : (
                    data.achievements.categories.map((c, i) => (
                      <div
                        key={c.category}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="capitalize text-slate-700 dark:text-slate-300">
                            {c.category}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {c.count}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCTIVITY & FOCUS DEEP DIVE */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Productivity & Focus Telemetry Summary
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authentic focus sessions logged via Pomodoro timer and completed projects
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Completed Pomodoros
                  </span>
                  <span className="font-black text-lg text-slate-900 dark:text-white mt-1 block">
                    {data.productivity.pomodoro_sessions}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Total Focus Time
                  </span>
                  <span className="font-black text-lg text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {data.productivity.total_focus_hours} hours
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Active Projects
                  </span>
                  <span className="font-black text-lg text-slate-900 dark:text-white mt-1 block">
                    {data.productivity.total_projects}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Platform Admins
                  </span>
                  <span className="font-black text-lg text-purple-600 dark:text-purple-400 mt-1 block">
                    {data.students.admins}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
