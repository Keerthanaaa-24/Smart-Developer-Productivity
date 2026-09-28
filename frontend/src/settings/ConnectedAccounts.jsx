import { useEffect, useState } from "react";
import API from "../api/axios";

const ConnectedAccounts = () => {
  const [connections, setConnections] = useState({
    github: false,
    leetcode: false,
    freecodecamp: false,
    geeksforgeeks: false,
    nptel: false,
    coursera: false,
  });

  const [accountData, setAccountData] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState("");

  const platforms = [
    {
      key: "github",
      name: "GitHub",
      short: "GH",
      description:
        "Repositories, commits, pull requests, issues and coding activity.",
      endpoint: "/github/status",
      connectEndpoint: "/github/login",
      disconnectEndpoint: "/github/disconnect",
      usernameFields: ["username", "login"],
      gradient: "from-gray-900 via-gray-800 to-gray-700",
      icon: "🐙",
      type: "oauth",
    },
    {
      key: "leetcode",
      name: "LeetCode",
      short: "LC",
      description:
        "Problem solving, coding progress and competitive programming.",
      endpoint: "/leetcode/status",
      connectEndpoint: "/leetcode/connect",
      disconnectEndpoint: "/leetcode/disconnect",
      usernameFields: ["username", "leetcode_username"],
      gradient: "from-orange-500 to-amber-500",
      icon: "💻",
      type: "username",
    },
    {
      key: "freecodecamp",
      name: "freeCodeCamp",
      short: "FCC",
      description:
        "Learning profile, certifications and coding journey.",
      endpoint: "/freecodecamp/status",
      connectEndpoint: "/freecodecamp/connect",
      disconnectEndpoint: "/freecodecamp/disconnect",
      usernameFields: [
        "username",
        "freecodecamp_username",
      ],
      gradient: "from-gray-800 to-gray-600",
      icon: "🔥",
      type: "username",
    },
    {
      key: "geeksforgeeks",
      name: "GeeksforGeeks",
      short: "GFG",
      description:
        "Programming profile, problem solving and learning activity.",
      endpoint: "/geeksforgeeks/status",
      connectEndpoint: "/geeksforgeeks/connect",
      disconnectEndpoint: "/geeksforgeeks/disconnect",
      usernameFields: ["username", "gfg_username"],
      gradient: "from-green-600 to-emerald-500",
      icon: "🟢",
      type: "username",
    },
    {
      key: "nptel",
      name: "NPTEL",
      short: "NPTEL",
      description:
        "Courses, certificates and your academic learning journey.",
      endpoint: "/nptel/status",
      connectEndpoint: "/nptel/connect",
      disconnectEndpoint: "/nptel/disconnect",
      usernameFields: ["username", "nptel_username"],
      gradient: "from-blue-700 to-indigo-600",
      icon: "🎓",
      type: "username",
    },
    {
      key: "coursera",
      name: "Coursera",
      short: "CO",
      description:
        "Courses, certificates and professional learning progress.",
      endpoint: "/coursera/status",
      connectEndpoint: "/coursera/connect",
      disconnectEndpoint: "/coursera/disconnect",
      usernameFields: ["username", "coursera_username"],
      gradient: "from-blue-600 to-cyan-500",
      icon: "📚",
      type: "username",
    },
  ];

  // =====================================================
  // CHECK ALL CONNECTIONS
  // =====================================================

  useEffect(() => {
    checkAllConnections();
  }, []);

  const checkAllConnections = async () => {
    setLoading(true);

    try {
      const results = await Promise.allSettled(
        platforms.map((platform) =>
          API.get(platform.endpoint)
        )
      );

      const newConnections = {};
      const newAccountData = {};

      results.forEach((result, index) => {
        const platform = platforms[index];

        if (
          result.status === "fulfilled" &&
          result.value?.data?.connected
        ) {
          newConnections[platform.key] = true;

          const responseData = result.value.data;

          newAccountData[platform.key] =
            responseData[platform.key] ||
            responseData.github ||
            responseData.leetcode ||
            responseData.freecodecamp ||
            responseData.geeksforgeeks ||
            responseData.nptel ||
            responseData.coursera ||
            {};
        } else {
          newConnections[platform.key] = false;
        }
      });

      setConnections(newConnections);
      setAccountData(newAccountData);
    } catch (error) {
      console.error(
        "Failed to check platform connections:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GITHUB OAUTH
  // =====================================================

  const connectGithub = async () => {
    try {
      setConnecting("github");

      const response = await API.get(
        "/github/login"
      );

      const authorizationUrl =
        response.data.authorization_url;

      if (!authorizationUrl) {
        throw new Error(
          "GitHub authorization URL was not received."
        );
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.error(
        "GitHub connection failed:",
        error
      );

      alert(
        "Unable to connect GitHub. Please try again."
      );

      setConnecting("");
    }
  };

  // =====================================================
  // USERNAME BASED PLATFORMS
  // =====================================================

  const connectUsernamePlatform = async (
    platform
  ) => {
    const username = window.prompt(
      `Enter your ${platform.name} username:`
    );

    if (!username || !username.trim()) {
      return;
    }

    try {
      setConnecting(platform.key);

      await API.post(
        platform.connectEndpoint,
        null,
        {
          params: {
            username: username.trim(),
          },
        }
      );

      await checkAllConnections();

      alert(
        `${platform.name} connected successfully!`
      );
    } catch (error) {
      console.error(
        `${platform.name} connection failed:`,
        error
      );

      alert(
        error.response?.data?.detail ||
          `Unable to connect ${platform.name}.`
      );
    } finally {
      setConnecting("");
    }
  };

  // =====================================================
  // CONNECT
  // =====================================================

  const handleConnect = (platform) => {
    if (platform.type === "oauth") {
      connectGithub();
    } else {
      connectUsernamePlatform(platform);
    }
  };

  // =====================================================
  // DISCONNECT
  // =====================================================

  const handleDisconnect = async (
    platform
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to disconnect ${platform.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setConnecting(platform.key);

      await API.delete(
        platform.disconnectEndpoint
      );

      await checkAllConnections();
    } catch (error) {
      console.error(
        "Disconnect failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          `Unable to disconnect ${platform.name}.`
      );
    } finally {
      setConnecting("");
    }
  };

  // =====================================================
  // OPEN PROFILE
  // =====================================================

  const openProfile = (platform) => {
    const data =
      accountData[platform.key];

    if (!data?.profile_url) {
      return;
    }

    window.open(
      data.profile_url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =====================================================
  // GET USERNAME
  // =====================================================

  const getUsername = (platform) => {
    const data =
      accountData[platform.key];

    if (!data) {
      return "";
    }

    for (const field of platform.usernameFields) {
      if (data[field]) {
        return data[field];
      }
    }

    return "";
  };

  // =====================================================
  // CONNECTED COUNT
  // =====================================================

  const connectedCount =
    Object.values(connections).filter(
      Boolean
    ).length;

  const progress =
    (connectedCount / platforms.length) * 100;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="bg-slate-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-5 sm:px-8 py-8 sm:py-10">

        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />

        <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-blue-200 text-xs font-semibold mb-4">

                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

                Developer Ecosystem

              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Connected Accounts
              </h2>

              <p className="text-slate-300 mt-2 max-w-2xl text-sm sm:text-base">
                Connect your coding and learning platforms
                to build one unified developer productivity profile.
              </p>

            </div>

            <button
              onClick={checkAllConnections}
              disabled={loading}
              className="self-start lg:self-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium backdrop-blur-sm transition disabled:opacity-50"
            >
              {loading
                ? "Checking..."
                : "↻ Refresh"}
            </button>

          </div>

          {/* SUMMARY */}

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">

            <div className="rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">

              <p className="text-xs text-slate-400">
                Connected
              </p>

              <p className="text-2xl font-bold text-white mt-1">
                {connectedCount}
                <span className="text-sm text-slate-400">
                  {" "}
                  / 6
                </span>
              </p>

            </div>

            <div className="rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">

              <p className="text-xs text-slate-400">
                Available
              </p>

              <p className="text-2xl font-bold text-white mt-1">
                6
              </p>

            </div>

            <div className="rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm p-4 col-span-2 sm:col-span-1">

              <p className="text-xs text-slate-400">
                Ecosystem
              </p>

              <p className="text-sm font-semibold text-white mt-2">
                Coding + Learning
              </p>

            </div>

          </div>

          {/* PROGRESS */}

          <div className="mt-6">

            <div className="flex justify-between text-xs mb-2">

              <span className="text-slate-400">
                Integration progress
              </span>

              <span className="text-blue-300 font-semibold">
                {Math.round(progress)}%
              </span>

            </div>

            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">

              <div
                className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                }}
              />

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          PLATFORM CARDS
      ================================================= */}

      <div className="p-5 sm:p-8">

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {platforms.map((platform) => {

            const connected =
              connections[platform.key];

            const isConnecting =
              connecting === platform.key;

            const username =
              getUsername(platform);

            const data =
              accountData[platform.key];

            return (
              <div
                key={platform.key}
                className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >

                {/* TOP GRADIENT */}

                <div
                  className={`h-1.5 bg-gradient-to-r ${platform.gradient}`}
                />

                <div className="p-5 sm:p-6">

                  {/* PLATFORM HEADER */}

                  <div className="flex items-start justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shadow-md`}
                      >
                        {platform.icon}
                      </div>

                      <div>

                        <h3 className="font-bold text-slate-900">
                          {platform.name}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-1">

                          <span
                            className={`w-2 h-2 rounded-full ${
                              connected
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                            }`}
                          />

                          <span
                            className={`text-xs font-medium ${
                              connected
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}
                          >
                            {connected
                              ? "Connected"
                              : "Not connected"}
                          </span>

                        </div>

                      </div>

                    </div>

                    <span className="text-xs font-bold text-slate-300 group-hover:text-slate-400 transition">
                      {platform.short}
                    </span>

                  </div>

                  {/* DESCRIPTION */}

                  <p className="text-sm text-slate-500 leading-6 mt-5 min-h-[72px]">
                    {platform.description}
                  </p>

                  {/* CONNECTED ACCOUNT */}

                  {connected && (
                    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3">

                      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Connected account
                      </p>

                      <div className="flex items-center justify-between gap-3 mt-1">

                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {username ||
                            "Account connected"}
                        </p>

                        {data?.profile_url && (
                          <button
                            onClick={() =>
                              openProfile(
                                platform
                              )
                            }
                            className="text-xs text-blue-600 hover:text-blue-700 font-semibold whitespace-nowrap"
                          >
                            View
                          </button>
                        )}

                      </div>

                    </div>
                  )}

                  {/* ACTION */}

                  <div className="mt-5">

                    {connected ? (

                      <button
                        onClick={() =>
                          handleDisconnect(
                            platform
                          )
                        }
                        disabled={isConnecting}
                        className="w-full py-2.5 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-sm transition disabled:opacity-50"
                      >
                        {isConnecting
                          ? "Disconnecting..."
                          : "Disconnect account"}
                      </button>

                    ) : (

                      <button
                        onClick={() =>
                          handleConnect(
                            platform
                          )
                        }
                        disabled={isConnecting}
                        className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${platform.gradient} text-white font-semibold text-sm shadow-sm hover:shadow-md transition disabled:opacity-50`}
                      >
                        {isConnecting
                          ? "Connecting..."
                          : "Connect account"}
                      </button>

                    )}

                  </div>

                </div>

              </div>
            );
          })}

        </div>

        {/* =================================================
            PRIVACY NOTE
        ================================================= */}

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">

          <div className="flex gap-3">

            <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              🔐
            </div>

            <div>

              <h4 className="font-semibold text-slate-900 text-sm">
                Your accounts stay private
              </h4>

              <p className="text-sm text-slate-500 leading-6 mt-1">
                Each platform connection belongs to the
                currently logged-in user. Your connected
                account information is not shared with other users.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ConnectedAccounts;