import { useEffect, useState, useCallback } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../api/axios";

import DashboardHero from "../components/dashboard/DashboardHero";
import PrimaryFiveMetrics from "../components/dashboard/PrimaryFiveMetrics";
import ProductivityChart from "../components/dashboard/ProductivityChart";
import StreakCard from "../components/dashboard/StreakCard";
import CareerActivityCard from "../components/dashboard/CareerActivityCard";
import AIInsights from "../components/dashboard/AIInsights";
import RecentActivity from "../components/dashboard/RecentActivity";

import { getDashboardOverview } from "../api/dashboardApi";

const SkeletonBlock = ({ className = "h-32" }) => (
  <div className={`bg-slate-200/80 dark:bg-slate-900/60 border border-slate-300/60 dark:border-slate-800 animate-pulse rounded-3xl ${className}`} />
);

const getCachedUserOverview = () => {
  try {
    const rawUser = localStorage.getItem("user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (!user?.id) return null;
    const cached = sessionStorage.getItem(`sdp_dash_overview_${user.id}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCachedUserOverview = (data) => {
  try {
    const rawUser = localStorage.getItem("user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (!user?.id || !data) return;
    sessionStorage.setItem(`sdp_dash_overview_${user.id}`, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
};

const Dashboard = () => {
  const [overview, setOverview] = useState(() => getCachedUserOverview());
  const [loading, setLoading] = useState(!overview);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!overview) {
      setLoading(true);
    }
    setError("");

    try {
      if (isRefresh) {
        try {
          await API.post("/activity/sync");
        } catch (syncErr) {
          console.warn("Manual sync warning:", syncErr);
        }
      }
      const data = await getDashboardOverview();
      setOverview(data);
      setCachedUserOverview(data);
    } catch (err) {
      console.error("Dashboard overview error:", err);
      if (!overview) {
        setError(err.friendlyMessage || "Unable to load live dashboard telemetry. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [overview]);

  useEffect(() => {
    fetchOverview();

    const handleBackendWarmed = () => {
      fetchOverview(false);
    };

    window.addEventListener("backend-warmed", handleBackendWarmed);
    return () => {
      window.removeEventListener("backend-warmed", handleBackendWarmed);
    };
  }, [fetchOverview]);

  return (
    <MainLayout>
      <div className="space-y-7 pb-12">
        {/* Error Notification */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 px-5 py-4 rounded-2xl flex items-center justify-between text-sm">
            <span>{error}</span>
            <button
              onClick={() => fetchOverview(true)}
              className="font-bold underline ml-4 cursor-pointer hover:text-rose-700 dark:hover:text-rose-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* STAGE 1: Immediate Shell & Top 5 Productivity Metrics */}
        <DashboardHero
          user={overview?.user}
          onRefresh={() => fetchOverview(true)}
          refreshing={refreshing}
        />

        {loading && !overview ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <SkeletonBlock className="lg:col-span-4 h-64" />
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} className="h-28" />
              ))}
            </div>
          </div>
        ) : (
          <PrimaryFiveMetrics
            metrics={overview?.primary_metrics}
            todaySummary={overview?.today_summary}
          />
        )}

        {/* STAGE 2: Charts & Streak */}
        {loading && !overview ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <SkeletonBlock className="lg:col-span-7 h-80" />
            <SkeletonBlock className="lg:col-span-5 h-80" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <ProductivityChart weeklyData={overview?.weekly_productivity} />
            </div>
            <div className="lg:col-span-5">
              <StreakCard streakData={overview?.streak} />
            </div>
          </div>
        )}

        {/* STAGE 3: Career Pipeline & AI Insights */}
        {loading && !overview ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonBlock className="h-72" />
            <SkeletonBlock className="h-72" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CareerActivityCard careerSummary={overview?.career_summary} />
            <AIInsights insights={overview?.ai_insights} />
          </div>
        )}

        {/* STAGE 4: Recent Verified Activity Feed */}
        {loading && !overview ? (
          <SkeletonBlock className="h-72" />
        ) : (
          <RecentActivity timeline={overview?.timeline} />
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;