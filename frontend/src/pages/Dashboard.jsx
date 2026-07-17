import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";

import DashboardCards from "../components/dashboard/DashboardCards";

import ProductivityChart from "../components/dashboard/ProductivityChart";

import StreakCard from "../components/dashboard/StreakCard";

import GithubStats from "../components/dashboard/GithubStats";

import ActivityHeatmap from "../components/dashboard/ActivityHeatmap";

import WeeklyProgress from "../components/dashboard/WeeklyProgress";

import AIInsights from "../components/dashboard/AIInsights";

import { getDashboardStats } from "../api/dashboardApi";

const Dashboard = () => {

  const [stats, setStats] =
    useState(null);

  useEffect(() => {

    fetchStats();

  }, []);

  const fetchStats = async () => {

    try {

      const data =
        await getDashboardStats();

      setStats(data);

    } catch (error) {

      console.log(error);
    }
  };

  return (

    <MainLayout>

      <div className="space-y-8">

        <DashboardCards
          stats={stats}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <ProductivityChart />

          <StreakCard />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <GithubStats />

          <WeeklyProgress />

        </div>

        <ActivityHeatmap />

        <AIInsights />

      </div>

    </MainLayout>
  );
};

export default Dashboard;