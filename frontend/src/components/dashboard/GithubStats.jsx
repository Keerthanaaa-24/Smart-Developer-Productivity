import { useEffect, useState } from "react";

import API from "../../api/axios";

const GithubStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGithubStats = async () => {
      try {
        const response = await API.get(
          "/github/statistics"
        );

        setStats(response.data);
      } catch (error) {
        console.error(
          "Failed to fetch GitHub statistics:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchGithubStats();
  }, []);

  const statisticCards = [
    {
      title: "Repositories",
      value:
        stats?.repositories?.total || 0,
      icon: "📁",
    },
    {
      title: "Commits",
      value:
        stats?.commits?.total || 0,
      icon: "💻",
    },
    {
      title: "Pull Requests",
      value:
        stats?.pull_requests?.total || 0,
      icon: "🔀",
    },
    {
      title: "Issues",
      value:
        stats?.issues?.total || 0,
      icon: "🐛",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

      <div className="flex items-center justify-between mb-6">

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            GitHub Statistics
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Real statistics from your connected GitHub account.
          </p>
        </div>

        <div className="text-2xl">
          🐙
        </div>

      </div>


      {/* Statistics */}

      <div className="grid grid-cols-2 gap-4">

        {statisticCards.map((item) => (

          <div
            key={item.title}
            className="rounded-xl bg-slate-50 border border-slate-100 p-4"
          >

            <div className="flex items-center justify-between">

              <span className="text-xl">
                {item.icon}
              </span>

              <span className="text-2xl font-bold text-blue-600">
                {loading
                  ? "..."
                  : item.value}
              </span>

            </div>

            <p className="text-sm text-slate-500 mt-3">
              {item.title}
            </p>

          </div>

        ))}

      </div>


      {/* Languages */}

      <div className="mt-6">

        <h3 className="font-semibold text-slate-800 mb-3">
          Top Languages
        </h3>

        <div className="flex flex-wrap gap-2">

          {stats?.languages?.items
            ?.slice(0, 6)
            .map((language) => (

              <span
                key={language.language}
                className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold"
              >
                {language.language}
                {" "}
                {language.percentage}%
              </span>

            ))}

          {!loading &&
            (!stats?.languages?.items ||
              stats.languages.items.length === 0) && (
              <p className="text-sm text-slate-400">
                No language data available.
              </p>
            )}

        </div>

      </div>

    </div>
  );
};

export default GithubStats;