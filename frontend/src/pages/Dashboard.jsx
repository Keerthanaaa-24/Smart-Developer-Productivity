import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";

import DashboardCards from "../components/dashboard/DashboardCards";
import ProductivityChart from "../components/dashboard/ProductivityChart";
import StreakCard from "../components/dashboard/StreakCard";
import AIInsights from "../components/dashboard/AIInsights";
import RecentActivity from "../components/dashboard/RecentActivity";

import { getDashboardStats } from "../api/dashboardApi";

const Dashboard = () => {
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Dashboard error:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6 lg:space-y-8">

        <DashboardCards stats={stats} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ProductivityChart stats={stats} />
          <StreakCard stats={stats} />
        </div>

        <RecentActivity stats={stats} />

        <AIInsights stats={stats} />

      </div>
    </MainLayout>
  );
};

export default Dashboard;