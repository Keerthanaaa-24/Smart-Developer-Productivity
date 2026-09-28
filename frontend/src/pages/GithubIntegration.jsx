import { useEffect, useState } from "react";
import API from "../api/axios";

const GithubIntegration = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [commits, setCommits] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [issues, setIssues] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [activity, setActivity] = useState([]);

  const [activeTab, setActiveTab] = useState("overview");

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    loadGithubData();
  }, []);

  const loadGithubData = async () => {
    if (!token) {
      setError("Please login first.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        profileResponse,
        repositoriesResponse,
        commitsResponse,
        pullRequestsResponse,
        issuesResponse,
        languagesResponse,
        activityResponse,
      ] = await Promise.all([
        API.get(
          "/github/profile",
          authConfig
        ),

        API.get(
          "/github/repositories",
          authConfig
        ),

        API.get(
          "/github/commits",
          authConfig
        ),

        API.get(
          "/github/pull-requests",
          authConfig
        ),

        API.get(
          "/github/issues",
          authConfig
        ),

        API.get(
          "/github/languages",
          authConfig
        ),

        API.get(
          "/github/activity",
          authConfig
        ),
      ]);

      setProfile(
        profileResponse.data
      );

      setRepositories(
        repositoriesResponse.data.repositories || []
      );

      setCommits(
        commitsResponse.data.commits || []
      );

      setPullRequests(
        pullRequestsResponse.data.pull_requests || []
      );

      setIssues(
        issuesResponse.data.issues || []
      );

      setLanguages(
        languagesResponse.data.languages || []
      );

      setActivity(
        activityResponse.data.activity || []
      );

    } catch (err) {
      console.error(
        "GitHub dashboard error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Unable to load GitHub data."
      );

    } finally {
      setLoading(false);
    }
  };

  const connectGithub = async () => {
    try {
      const response = await API.get(
        "/github/login",
        authConfig
      );

      window.location.href =
        response.data.authorization_url;

    } catch (err) {
      alert(
        "Unable to start GitHub connection."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString();
  };

  const getActivityText = (item) => {
    const type = item.type || "";

    switch (type) {
      case "PushEvent":
        return "Pushed code";

      case "PullRequestEvent":
        return "Pull request activity";

      case "IssuesEvent":
        return "Issue activity";

      case "CreateEvent":
        return "Created something";

      case "DeleteEvent":
        return "Deleted something";

      case "WatchEvent":
        return "Starred a repository";

      case "ForkEvent":
        return "Forked a repository";

      case "IssueCommentEvent":
        return "Commented on an issue";

      default:
        return type.replace(
          "Event",
          ""
        );
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />

          <p className="text-gray-600">
            Loading GitHub data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            GitHub
          </h2>

          <p className="text-red-600 mb-6">
            {error}
          </p>

          <button
            onClick={connectGithub}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Connect GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            GitHub
          </h1>

          <p className="text-gray-500 mt-1">
            Your real GitHub development activity.
          </p>
        </div>

        <button
          onClick={loadGithubData}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-gray-800"
        >
          Refresh Data
        </button>

      </div>

      {/* =================================================
          PROFILE
      ================================================= */}

      {profile && (
        <div className="bg-white rounded-2xl shadow border p-6">

          <div className="flex flex-col md:flex-row gap-6 items-start">

            <img
              src={profile.avatar_url}
              alt="GitHub"
              className="w-24 h-24 rounded-full border-4 border-gray-100"
            />

            <div className="flex-1">

              <h2 className="text-2xl font-bold text-gray-900">
                {profile.name ||
                  profile.username}
              </h2>

              <p className="text-blue-600">
                @{profile.username}
              </p>

              {profile.bio && (
                <p className="text-gray-600 mt-2">
                  {profile.bio}
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">

                <Stat
                  label="Repositories"
                  value={profile.public_repos}
                />

                <Stat
                  label="Followers"
                  value={profile.followers}
                />

                <Stat
                  label="Following"
                  value={profile.following}
                />

                <Stat
                  label="Commits"
                  value={commits.length}
                />

              </div>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          TABS
      ================================================= */}

      <div className="bg-white rounded-xl shadow border p-2 overflow-x-auto">

        <div className="flex gap-2 min-w-max">

          {[
            ["overview", "Overview"],
            ["repositories", "Repositories"],
            ["commits", "Commits"],
            ["pullrequests", "Pull Requests"],
            ["issues", "Issues"],
            ["languages", "Languages"],
            ["activity", "Recent Activity"],
          ].map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() =>
                  setActiveTab(key)
                }
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === key
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            )
          )}

        </div>

      </div>

      {/* =================================================
          OVERVIEW
      ================================================= */}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <SummaryCard
            title="Repositories"
            value={repositories.length}
            subtitle="Total accessible repositories"
          />

          <SummaryCard
            title="Commits"
            value={commits.length}
            subtitle="Recent commits found"
          />

          <SummaryCard
            title="Pull Requests"
            value={pullRequests.length}
            subtitle="Your pull requests"
          />

          <SummaryCard
            title="Issues"
            value={issues.length}
            subtitle="Your issues"
          />

          <SummaryCard
            title="Languages"
            value={languages.length}
            subtitle="Languages detected"
          />

          <SummaryCard
            title="Activity"
            value={activity.length}
            subtitle="Recent GitHub events"
          />

        </div>
      )}

      {/* =================================================
          REPOSITORIES
      ================================================= */}

      {activeTab === "repositories" && (
        <div className="space-y-4">

          {repositories.map(
            (repo) => (
              <div
                key={repo.id}
                className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition"
              >

                <div className="flex flex-col md:flex-row md:justify-between gap-4">

                  <div>

                    <h3 className="text-lg font-bold text-gray-900">
                      {repo.name}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {repo.full_name}
                    </p>

                    {repo.description && (
                      <p className="text-gray-600 mt-2">
                        {repo.description}
                      </p>
                    )}

                  </div>

                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-medium"
                  >
                    Open GitHub →
                  </a>

                </div>

                <div className="flex flex-wrap gap-3 mt-4 text-sm">

                  <Badge
                    text={
                      repo.language ||
                      "Unknown"
                    }
                  />

                  <Badge
                    text={`⭐ ${repo.stars}`}
                  />

                  <Badge
                    text={`🍴 ${repo.forks}`}
                  />

                  <Badge
                    text={`Issues ${repo.open_issues}`}
                  />

                  {repo.private && (
                    <Badge text="Private" />
                  )}

                </div>

              </div>
            )
          )}

        </div>
      )}

      {/* =================================================
          COMMITS
      ================================================= */}

      {activeTab === "commits" && (
        <div className="bg-white rounded-xl shadow border divide-y">

          {commits.map(
            (commit) => (
              <div
                key={commit.sha}
                className="p-5"
              >

                <div className="flex justify-between gap-4">

                  <div>

                    <h3 className="font-semibold text-gray-900">
                      {commit.message}
                    </h3>

                    <p className="text-sm text-blue-600 mt-1">
                      {commit.repository}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(
                        commit.date
                      )}
                    </p>

                  </div>

                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-sm"
                  >
                    View
                  </a>

                </div>

              </div>
            )
          )}

        </div>
      )}

      {/* =================================================
          PULL REQUESTS
      ================================================= */}

      {activeTab === "pullrequests" && (
        <div className="space-y-4">

          {pullRequests.map(
            (pr) => (
              <div
                key={pr.id}
                className="bg-white rounded-xl border shadow-sm p-5"
              >

                <div className="flex justify-between gap-4">

                  <div>

                    <h3 className="font-bold text-gray-900">
                      {pr.title}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {pr.repository}
                    </p>

                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs h-fit ${
                      pr.state === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {pr.state}
                  </span>

                </div>

                <div className="mt-3 flex justify-between">

                  <span className="text-xs text-gray-500">
                    Updated{" "}
                    {formatDate(
                      pr.updated_at
                    )}
                  </span>

                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-sm"
                  >
                    View PR →
                  </a>

                </div>

              </div>
            )
          )}

        </div>
      )}

      {/* =================================================
          ISSUES
      ================================================= */}

      {activeTab === "issues" && (
        <div className="space-y-4">

          {issues.map(
            (issue) => (
              <div
                key={issue.id}
                className="bg-white rounded-xl border shadow-sm p-5"
              >

                <div className="flex justify-between gap-4">

                  <div>

                    <h3 className="font-bold text-gray-900">
                      {issue.title}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {issue.repository}
                    </p>

                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs h-fit ${
                      issue.state === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {issue.state}
                  </span>

                </div>

                <div className="mt-3">

                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-sm"
                  >
                    View Issue →
                  </a>

                </div>

              </div>
            )
          )}

        </div>
      )}

      {/* =================================================
          LANGUAGES
      ================================================= */}

      {activeTab === "languages" && (
        <div className="bg-white rounded-xl shadow border p-6">

          <h2 className="text-xl font-bold mb-5">
            Language Usage
          </h2>

          <div className="space-y-5">

            {languages.map(
              (language) => (
                <div
                  key={language.language}
                >

                  <div className="flex justify-between mb-2">

                    <span className="font-medium">
                      {language.language}
                    </span>

                    <span className="text-gray-500">
                      {language.percentage}%
                    </span>

                  </div>

                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${language.percentage}%`,
                      }}
                    />

                  </div>

                </div>
              )
            )}

          </div>

        </div>
      )}

      {/* =================================================
          ACTIVITY
      ================================================= */}

      {activeTab === "activity" && (
        <div className="bg-white rounded-xl shadow border divide-y">

          {activity.map(
            (item) => (
              <div
                key={item.id}
                className="p-5"
              >

                <h3 className="font-semibold text-gray-900">
                  {getActivityText(item)}
                </h3>

                <p className="text-sm text-blue-600 mt-1">
                  {item.repository ||
                    "GitHub"}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(
                    item.created_at
                  )}
                </p>

              </div>
            )
          )}

        </div>
      )}

    </div>
  );
};


/* =========================================================
   SMALL COMPONENTS
========================================================= */

const Stat = ({
  label,
  value,
}) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <p className="text-xs text-gray-500">
      {label}
    </p>

    <p className="text-xl font-bold text-gray-900">
      {value ?? 0}
    </p>
  </div>
);


const SummaryCard = ({
  title,
  value,
  subtitle,
}) => (
  <div className="bg-white rounded-xl border shadow-sm p-6">

    <p className="text-gray-500 text-sm">
      {title}
    </p>

    <p className="text-3xl font-bold text-gray-900 mt-2">
      {value}
    </p>

    <p className="text-xs text-gray-400 mt-2">
      {subtitle}
    </p>

  </div>
);


const Badge = ({
  text,
}) => (
  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
    {text}
  </span>
);


export default GithubIntegration;