import { useEffect, useMemo, useState } from "react";
import {
  FaGithub,
  FaFire,
  FaCode,
  FaChartLine,
  FaTrophy,
  FaCheckCircle,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import MainLayout from "../layouts/MainLayout";
import API from "../api/axios";


// =========================================================
// PLATFORMS
// =========================================================

const PLATFORMS = [
  {
    key: "github",
    name: "GitHub",
    icon: "🐙",
  },
  {
    key: "leetcode",
    name: "LeetCode",
    icon: "💻",
  },
  {
    key: "geeksforgeeks",
    name: "GeeksForGeeks",
    icon: "🟢",
  },
  {
    key: "freecodecamp",
    name: "freeCodeCamp",
    icon: "🔥",
  },
  {
    key: "nptel",
    name: "NPTEL",
    icon: "🎓",
  },
  {
    key: "coursera",
    name: "Coursera",
    icon: "📚",
  },
];


// =========================================================
// HELPERS
// =========================================================

const numberValue = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};


const getGitHubStats = (data) => {
  return {
    repositories:
      numberValue(
        data?.repositories ??
        data?.repo_count ??
        data?.public_repos
      ),

    commits:
      numberValue(
        data?.commits ??
        data?.commit_count ??
        data?.total_commits
      ),

    pullRequests:
      numberValue(
        data?.pull_requests ??
        data?.pull_request_count
      ),

    issues:
      numberValue(
        data?.issues ??
        data?.issue_count
      ),
  };
};


const normalizeLanguages = (data) => {

  if (!data) {
    return [];
  }

  const languages =
    data.languages ??
    data;

  if (Array.isArray(languages)) {

    return languages
      .map((item) => {

        if (
          typeof item === "string"
        ) {
          return {
            name: item,
            value: 1,
          };
        }

        return {
          name:
            item.name ??
            item.language ??
            "Unknown",

          value:
            numberValue(
              item.value ??
              item.count ??
              item.bytes ??
              1
            ),
        };
      })
      .filter(
        (item) => item.value > 0
      );
  }

  if (
    typeof languages === "object"
  ) {

    return Object.entries(
      languages
    ).map(
      ([name, value]) => ({
        name,
        value: numberValue(value),
      })
    );
  }

  return [];
};


const normalizeDailyContributions = (
  data
) => {

  if (!data) {
    return [];
  }

  let days =
    data.days ??
    data.contributions ??
    data.data ??
    [];

  if (!Array.isArray(days)) {
    return [];
  }

  return days.map((item) => ({
    date:
      item.date ??
      item.day ??
      "",

    count:
      numberValue(
        item.count ??
        item.contributions ??
        item.value
      ),
  }));
};


// =========================================================
// COMPONENT
// =========================================================

const Analytics = () => {

  const [streak, setStreak] =
    useState(null);

  const [githubStats, setGithubStats] =
    useState(null);

  const [dailyContributions, setDailyContributions] =
    useState([]);

  const [languages, setLanguages] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =======================================================
  // LOAD ANALYTICS
  // =======================================================

  const loadAnalytics = async () => {

    setLoading(true);
    setError("");

    try {

      const [
        streakResponse,
        statsResponse,
        contributionResponse,
        languageResponse,
      ] = await Promise.allSettled([

        API.get(
          "/developer-activity/streak"
        ),

        API.get(
          "/github/statistics"
        ),

        API.get(
          "/github/daily-contributions"
        ),

        API.get(
          "/github/languages"
        ),

      ]);


      // ---------------------------------------------------
      // Developer Streak
      // ---------------------------------------------------

      if (
        streakResponse.status ===
        "fulfilled"
      ) {

        setStreak(
          streakResponse.value.data
        );
      }


      // ---------------------------------------------------
      // GitHub Statistics
      // ---------------------------------------------------

      if (
        statsResponse.status ===
        "fulfilled"
      ) {

        setGithubStats(
          getGitHubStats(
            statsResponse.value.data
          )
        );
      }


      // ---------------------------------------------------
      // Daily Contributions
      // ---------------------------------------------------

      if (
        contributionResponse.status ===
        "fulfilled"
      ) {

        setDailyContributions(
          normalizeDailyContributions(
            contributionResponse.value.data
          )
        );
      }


      // ---------------------------------------------------
      // Languages
      // ---------------------------------------------------

      if (
        languageResponse.status ===
        "fulfilled"
      ) {

        setLanguages(
          normalizeLanguages(
            languageResponse.value.data
          )
        );
      }


      const allFailed =
        streakResponse.status === "rejected" &&
        statsResponse.status === "rejected" &&
        contributionResponse.status === "rejected" &&
        languageResponse.status === "rejected";


      if (allFailed) {

        setError(
          "Unable to load analytics data."
        );
      }

    } catch (err) {

      console.error(
        "Analytics loading error:",
        err
      );

      setError(
        "Unable to load analytics data."
      );

    } finally {

      setLoading(false);
    }
  };


  useEffect(() => {

    loadAnalytics();

  }, []);


  // =======================================================
  // LAST 30 DAYS
  // =======================================================

  const recentContributions =
    useMemo(() => {

      if (
        dailyContributions.length <= 30
      ) {
        return dailyContributions;
      }

      return dailyContributions.slice(
        -30
      );

    }, [dailyContributions]);


  const contributionChartData =
    recentContributions.map(
      (item) => ({

        day:
          item.date
            ? item.date.slice(5)
            : "",

        contributions:
          item.count,

      })
    );


  // =======================================================
  // LANGUAGE DATA
  // =======================================================

  const languageChartData =
    languages
      .slice(0, 6)
      .map((item) => ({
        name: item.name,
        value: item.value,
      }));


  // =======================================================
  // TODAY'S PLATFORMS
  // =======================================================

  const activePlatforms =
    streak?.today_platforms ?? [];


  const activePlatformCount =
    streak?.active_platform_count ??
    activePlatforms.length;


  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {

    return (
      <MainLayout>

        <div className="min-h-[70vh] flex items-center justify-center">

          <div className="text-center">

            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

            <p className="mt-4 text-gray-500">
              Loading developer analytics...
            </p>

          </div>

        </div>

      </MainLayout>
    );
  }


  return (

    <MainLayout>

      <div className="space-y-8 pb-10">


        {/* =================================================
            HEADER
        ================================================= */}

        <div>

          <p className="text-blue-600 font-semibold text-sm">
            Developer Analytics
          </p>

          <h1 className="text-3xl font-bold text-gray-900 mt-1">
            Your Developer Performance
          </h1>

          <p className="text-gray-500 mt-2">
            Track your coding activity, learning
            consistency and developer growth.
          </p>

        </div>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">

            {error}

          </div>

        )}


        {/* =================================================
            DEVELOPER STREAK
        ================================================= */}

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-7 text-white shadow-lg">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div>

              <div className="flex items-center gap-3">

                <FaFire className="text-3xl" />

                <h2 className="text-xl font-semibold">
                  Developer Streak
                </h2>

              </div>

              <p className="text-5xl font-bold mt-4">
                {streak?.current_streak ?? 0}
                <span className="text-2xl ml-2">
                  Days
                </span>
              </p>

              <p className="mt-2 text-orange-100">
                Stay active on at least one
                developer platform every day.
              </p>

            </div>


            <div className="bg-white/15 rounded-xl p-5 min-w-[220px]">

              <p className="text-sm text-orange-100">
                Longest Developer Streak
              </p>

              <p className="text-3xl font-bold mt-2">
                {streak?.longest_streak ?? 0}
                <span className="text-lg ml-1">
                  days
                </span>
              </p>

              <div className="h-px bg-white/20 my-4" />

              <p className="text-sm text-orange-100">
                Total Active Days
              </p>

              <p className="text-xl font-bold mt-1">
                {streak?.total_active_days ?? 0}
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            TODAY'S ACTIVITY
        ================================================= */}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-bold text-gray-900">
                Today's Developer Activity
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Platforms active today
              </p>

            </div>

            <div className="text-right">

              <p className="text-2xl font-bold text-blue-600">
                {activePlatformCount} / 6
              </p>

              <p className="text-xs text-gray-500">
                platforms active
              </p>

            </div>

          </div>


          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">

            {PLATFORMS.map(
              (platform) => {

                const active =
                  activePlatforms.includes(
                    platform.key
                  );

                return (

                  <div
                    key={platform.key}
                    className={`rounded-xl border p-4 transition ${
                      active
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-2xl">
                        {platform.icon}
                      </span>

                      {active && (

                        <FaCheckCircle className="text-green-500" />

                      )}

                    </div>

                    <p className="font-semibold text-gray-800 mt-3 text-sm">
                      {platform.name}
                    </p>

                    <p
                      className={`text-xs mt-1 ${
                        active
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      {active
                        ? "Active today"
                        : "No activity"}
                    </p>

                  </div>

                );
              }
            )}

          </div>

        </div>


        {/* =================================================
            GITHUB PERFORMANCE
        ================================================= */}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          <div className="flex items-center gap-4 mb-6">

            <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center">

              <FaGithub className="text-2xl" />

            </div>

            <div>

              <h2 className="text-xl font-bold text-gray-900">
                GitHub Performance
              </h2>

              <p className="text-sm text-gray-500">
                Statistics from your connected GitHub account.
              </p>

            </div>

          </div>


          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="bg-gray-50 rounded-xl p-5">

              <p className="text-sm text-gray-500">
                Repositories
              </p>

              <p className="text-3xl font-bold mt-2">
                {githubStats?.repositories ?? 0}
              </p>

            </div>


            <div className="bg-gray-50 rounded-xl p-5">

              <p className="text-sm text-gray-500">
                Commits
              </p>

              <p className="text-3xl font-bold mt-2">
                {githubStats?.commits ?? 0}
              </p>

            </div>


            <div className="bg-gray-50 rounded-xl p-5">

              <p className="text-sm text-gray-500">
                Pull Requests
              </p>

              <p className="text-3xl font-bold mt-2">
                {githubStats?.pullRequests ?? 0}
              </p>

            </div>


            <div className="bg-gray-50 rounded-xl p-5">

              <p className="text-sm text-gray-500">
                Issues
              </p>

              <p className="text-3xl font-bold mt-2">
                {githubStats?.issues ?? 0}
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            DAILY CODING ACTIVITY
        ================================================= */}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          <div className="flex items-center justify-between mb-6">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">

                <FaChartLine />

              </div>

              <div>

                <h2 className="text-xl font-bold">
                  Daily Coding Activity
                </h2>

                <p className="text-sm text-gray-500">
                  GitHub contributions over the last 30 days.
                </p>

              </div>

            </div>

            <div className="text-right">

              <p className="text-xs text-gray-500">
                Last 30 days
              </p>

              <p className="text-lg font-bold text-blue-600">

                {recentContributions.reduce(
                  (sum, item) =>
                    sum + item.count,
                  0
                )}

              </p>

            </div>

          </div>


          {contributionChartData.length > 0 ? (

            <div className="h-[320px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={
                    contributionChartData
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="day"
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="contributions"
                    fill="#3b82f6"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          ) : (

            <div className="h-[260px] flex items-center justify-center bg-gray-50 rounded-xl">

              <div className="text-center">

                <FaCode className="text-3xl text-gray-300 mx-auto" />

                <p className="text-gray-400 mt-3">
                  No GitHub contribution data available.
                </p>

              </div>

            </div>

          )}

        </div>


        {/* =================================================
            LANGUAGE USAGE
        ================================================= */}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          <div className="flex items-center gap-3 mb-6">

            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">

              <FaCode />

            </div>

            <div>

              <h2 className="text-xl font-bold">
                Language Usage
              </h2>

              <p className="text-sm text-gray-500">
                Languages detected across your GitHub repositories.
              </p>

            </div>

          </div>


          {languageChartData.length > 0 ? (

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              <div className="h-[280px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        languageChartData
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >

                      {languageChartData.map(
                        (_, index) => (

                          <Cell
                            key={
                              `language-${index}`
                            }
                            fill={
                              [
                                "#3b82f6",
                                "#8b5cf6",
                                "#10b981",
                                "#f59e0b",
                                "#ef4444",
                                "#06b6d4",
                              ][
                                index %
                                6
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip />

                  </PieChart>

                </ResponsiveContainer>

              </div>


              <div className="space-y-3">

                {languageChartData.map(
                  (language, index) => (

                    <div
                      key={
                        language.name
                      }
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                    >

                      <div className="flex items-center gap-3">

                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              [
                                "#3b82f6",
                                "#8b5cf6",
                                "#10b981",
                                "#f59e0b",
                                "#ef4444",
                                "#06b6d4",
                              ][
                                index %
                                6
                              ],
                          }}
                        />

                        <span className="font-medium">
                          {language.name}
                        </span>

                      </div>

                      <span className="text-gray-500">
                        {language.value}
                      </span>

                    </div>

                  )
                )}

              </div>

            </div>

          ) : (

            <div className="h-[180px] flex items-center justify-center bg-gray-50 rounded-xl">

              <p className="text-gray-400">
                No language data available.
              </p>

            </div>

          )}

        </div>


        {/* =================================================
            QUICK SUMMARY
        ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="bg-white rounded-xl border border-gray-200 p-5">

            <div className="flex items-center gap-3">

              <FaFire className="text-orange-500" />

              <span className="text-sm text-gray-500">
                Current Developer Streak
              </span>

            </div>

            <p className="text-3xl font-bold mt-3">
              {streak?.current_streak ?? 0}
              <span className="text-sm font-normal text-gray-500 ml-1">
                days
              </span>
            </p>

          </div>


          <div className="bg-white rounded-xl border border-gray-200 p-5">

            <div className="flex items-center gap-3">

              <FaTrophy className="text-yellow-500" />

              <span className="text-sm text-gray-500">
                Best Streak
              </span>

            </div>

            <p className="text-3xl font-bold mt-3">
              {streak?.longest_streak ?? 0}
              <span className="text-sm font-normal text-gray-500 ml-1">
                days
              </span>
            </p>

          </div>


          <div className="bg-white rounded-xl border border-gray-200 p-5">

            <div className="flex items-center gap-3">

              <FaCheckCircle className="text-green-500" />

              <span className="text-sm text-gray-500">
                Active Platforms Today
              </span>

            </div>

            <p className="text-3xl font-bold mt-3">
              {activePlatformCount}
              <span className="text-sm font-normal text-gray-500 ml-1">
                / 6
              </span>
            </p>

          </div>

        </div>


        {/* =================================================
            REFRESH
        ================================================= */}

        <div className="flex justify-center">

          <button
            onClick={loadAnalytics}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-sm"
          >
            Refresh Analytics
          </button>

        </div>

      </div>

    </MainLayout>
  );
};

export default Analytics;