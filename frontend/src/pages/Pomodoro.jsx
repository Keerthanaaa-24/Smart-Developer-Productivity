import { useState, useEffect, useCallback } from "react";
import MainLayout from "../layouts/MainLayout";
import Timer from "../components/pomodoro/Timer";
import SessionStats from "../components/pomodoro/SessionStats";
import PomodoroHistory from "../components/pomodoro/PomodoroHistory";
import { getPomodoroStats, getPomodoroHistory } from "../api/pomodoroApi";
import { FaStopwatch } from "react-icons/fa";

const Pomodoro = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPomodoroData = useCallback(async () => {
    try {
      const [statsData, historyData] = await Promise.all([
        getPomodoroStats(),
        getPomodoroHistory(30),
      ]);
      setStats(statsData);
      setHistory(historyData);
    } catch (err) {
      console.error("Failed to load Pomodoro telemetry:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPomodoroData();
  }, [fetchPomodoroData]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
                <FaStopwatch className="text-xl" />
              </span>
              Focus & Pomodoro Workspace
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Structure deep work intervals, link sessions to your tasks, and stream focus telemetry.
            </p>
          </div>
        </div>

        {/* 2-Column Grid: Timer + Real Telemetry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <Timer onSessionCompleted={fetchPomodoroData} />
          </div>

          <div className="lg:col-span-7">
            <SessionStats stats={stats} loading={loading} />
          </div>
        </div>

        {/* History Section */}
        <div className="w-full">
          <PomodoroHistory history={history} loading={loading} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Pomodoro;