import { useEffect, useState, useCallback, useRef } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../api/axios";

import DashboardHero from "../components/dashboard/DashboardHero";
import StudentRankWidget from "../components/dashboard/StudentRankWidget";
import PrimaryFiveMetrics from "../components/dashboard/PrimaryFiveMetrics";
import MLProductivityCard from "../components/dashboard/MLProductivityCard";
import ProductivityChart from "../components/dashboard/ProductivityChart";
import StreakCard from "../components/dashboard/StreakCard";
import CareerActivityCard from "../components/dashboard/CareerActivityCard";
import AIInsights from "../components/dashboard/AIInsights";
import RecentActivity from "../components/dashboard/RecentActivity";
import PlatformTimeTrackingCard from "../components/dashboard/PlatformTimeTrackingCard";
import TodayActivityCards from "../components/dashboard/TodayActivityCards";

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
  const overviewRef = useRef(overview);
  overviewRef.current = overview;

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!overviewRef.current) {
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
      if (!overviewRef.current) {
        setError(err.friendlyMessage || "Unable to load live dashboard telemetry. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
        {/* Telemetry Status Notification */}
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-5 py-3.5 rounded-2xl flex items-center justify-between text-sm shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchOverview(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition shadow cursor-pointer ml-4 whitespace-nowrap"
            >
              Retry Telemetry
            </button>
          </div>
        )}

        {/* STAGE 1: Immediate Shell & Top 5 Productivity Metrics */}
        <DashboardHero
          user={overview?.user}
          onRefresh={() => fetchOverview(true)}
          refreshing={refreshing}
        />

        {/* Student Competition Standings & Arena Widget */}
        <StudentRankWidget />

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

        {/* STAGE 1.2: Deduplicated Today's Activity Breakdown */}
        {loading && !overview ? (
          <SkeletonBlock className="h-44" />
        ) : (
          <TodayActivityCards todaySummary={overview?.today_summary} />
        )}

        {/* STAGE 1.5: Real-Time Machine Learning Productivity Intelligence */}
        {loading && !overview ? (
          <SkeletonBlock className="h-64" />
        ) : (
          <MLProductivityCard
            mlData={overview?.ml_prediction}
            onRefresh={() => fetchOverview(true)}
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

        {/* STAGE 2.5: Secondary Browser Active Time Tracking */}
        <PlatformTimeTrackingCard />

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