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

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
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
    } catch (err) {
      console.error("Dashboard overview error:", err);
      setError("Unable to load live dashboard telemetry. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
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

        {loading ? (
          /* Loading Skeleton State */
          <div className="space-y-7">
            <SkeletonBlock className="h-20" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <SkeletonBlock className="lg:col-span-4 h-64" />
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonBlock key={i} className="h-28" />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <SkeletonBlock className="lg:col-span-7 h-80" />
              <SkeletonBlock className="lg:col-span-5 h-80" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonBlock className="h-72" />
              <SkeletonBlock className="h-72" />
            </div>
            <SkeletonBlock className="h-72" />
          </div>
        ) : (
          <>
            {/* 1. Personalized Greeting & Header */}
            <DashboardHero
              user={overview?.user}
              onRefresh={() => fetchOverview(true)}
              refreshing={refreshing}
            />

            {/* 2. THE 5 CORE PRIMARY PRODUCTIVITY METRICS */}
            <PrimaryFiveMetrics
              metrics={overview?.primary_metrics}
              todaySummary={overview?.today_summary}
            />

            {/* 3. Weekly Coding/Focus Trend & Login Streak */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <ProductivityChart weeklyData={overview?.weekly_productivity} />
              </div>
              <div className="lg:col-span-5">
                <StreakCard streakData={overview?.streak} />
              </div>
            </div>

            {/* 4. Career Pipeline & Grounded AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CareerActivityCard careerSummary={overview?.career_summary} />
              <AIInsights insights={overview?.ai_insights} />
            </div>

            {/* 5. Recent Verified Activity Feed */}
            <RecentActivity timeline={overview?.timeline} />
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;