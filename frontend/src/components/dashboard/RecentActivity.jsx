import { useEffect, useState } from "react";

import {
  FaGithub,
  FaCode,
  FaGraduationCap,
  FaBook,
  FaCertificate,
} from "react-icons/fa";

import { getRecentActivity } from "../../api/activityApi";

const platformStyles = {
  github: {
    icon: <FaGithub />,
    bg: "bg-gray-900",
  },

  leetcode: {
    icon: <FaCode />,
    bg: "bg-orange-500",
  },

  nptel: {
    icon: <FaGraduationCap />,
    bg: "bg-blue-600",
  },

  freecodecamp: {
    icon: <FaBook />,
    bg: "bg-green-600",
  },

  geeksforgeeks: {
    icon: <FaCode />,
    bg: "bg-green-700",
  },

  coursera: {
    icon: <FaCertificate />,
    bg: "bg-blue-500",
  },
};

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    try {
      const data = await getRecentActivity();

      setActivities(
        Array.isArray(data)
          ? data
          : data.activities || []
      );
    } catch (error) {
      console.error(
        "Recent activity error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();

    const interval = setInterval(
      loadActivities,
      60000
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

      <div className="flex items-center justify-between mb-6">

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Recent Developer Activity
          </h2>

          <p className="text-gray-500 mt-1">
            Your latest activity across connected platforms.
          </p>
        </div>

        <div className="text-sm text-gray-400">
          Live
        </div>

      </div>

      {loading ? (
        <div className="space-y-4">

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse flex items-center gap-4"
            >
              <div className="w-11 h-11 bg-gray-200 rounded-full" />

              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}

        </div>
      ) : activities.length === 0 ? (

        <div className="py-12 text-center">

          <div className="text-4xl mb-3">
            🚀
          </div>

          <h3 className="font-semibold text-gray-800">
            No recent activity
          </h3>

          <p className="text-gray-500 text-sm mt-1">
            Connect your developer accounts and start learning.
          </p>

        </div>

      ) : (

        <div className="space-y-2">

          {activities.map((activity, index) => {

            const platform =
              String(
                activity.platform || ""
              ).toLowerCase();

            const style =
              platformStyles[platform] ||
              {
                icon: <FaCode />,
                bg: "bg-indigo-600",
              };

            return (
              <div
                key={
                  activity.id ||
                  `${platform}-${index}`
                }
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition"
              >

                <div
                  className={`w-11 h-11 rounded-full ${style.bg} text-white flex items-center justify-center text-lg`}
                >
                  {style.icon}
                </div>

                <div className="flex-1 min-w-0">

                  <p className="font-semibold text-gray-900">
                    {activity.message}
                  </p>

                  {activity.details && (
                    <p className="text-sm text-gray-500 mt-1">
                      {activity.details}
                    </p>
                  )}

                </div>

                <div className="text-sm text-gray-400 whitespace-nowrap">
                  {activity.time_ago || "Recently"}
                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
};

export default RecentActivity;