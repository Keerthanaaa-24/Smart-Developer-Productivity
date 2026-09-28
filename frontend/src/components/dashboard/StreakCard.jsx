import { useEffect, useState } from "react";

import API from "../../api/axios";

const StreakCard = () => {
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalActiveDays, setTotalActiveDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeveloperStreak = async () => {
      try {
        const response = await API.get(
          "/developer-activity/streak"
        );

        setStreak(
          response.data?.current_streak || 0
        );

        setLongestStreak(
          response.data?.longest_streak || 0
        );

        setTotalActiveDays(
          response.data?.total_active_days || 0
        );

      } catch (error) {
        console.error(
          "Failed to fetch Developer Streak:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDeveloperStreak();
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white p-7 shadow-lg min-h-[260px]">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-white/80">
            Developer Streak
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {loading
              ? "..."
              : `${streak} ${
                  streak === 1
                    ? "Day"
                    : "Days"
                }`}
          </h2>

        </div>

        <div className="text-4xl">
          🔥
        </div>

      </div>

      <div className="mt-8">

        <p className="text-white/90 text-sm">
          {streak > 0
            ? "Keep your developer momentum going!"
            : "Complete an activity today to start your streak."}
        </p>

      </div>

      <div className="mt-8 pt-5 border-t border-white/20">

        <div className="flex justify-between text-sm mb-3">

          <span className="text-white/75">
            Longest streak
          </span>

          <span className="font-bold">
            {loading
              ? "..."
              : `${longestStreak} days`}
          </span>

        </div>

        <div className="flex justify-between text-sm">

          <span className="text-white/75">
            Total active days
          </span>

          <span className="font-bold">
            {loading
              ? "..."
              : totalActiveDays}
          </span>

        </div>

      </div>

    </div>
  );
};

export default StreakCard;