import MainLayout from "../layouts/MainLayout";

import CodingHoursChart from "../components/analytics/CodingHoursChart";

import LanguageUsageChart from "../components/analytics/LanguageUsageChart";

import GoalTracker from "../components/analytics/GoalTracker";

const Analytics = () => {

  return (

    <MainLayout>

      <div className="space-y-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <CodingHoursChart />

          <LanguageUsageChart />

        </div>

        <GoalTracker />

      </div>

    </MainLayout>
  );
};

export default Analytics;