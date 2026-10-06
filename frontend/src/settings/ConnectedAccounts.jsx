import { useEffect, useState, useRef, useCallback } from "react";
import API from "../api/axios";

const ConnectedAccounts = () => {
  const [connections, setConnections] = useState({
    github: false,
    leetcode: false,
    freecodecamp: false,
    geeksforgeeks: false,
    nptel: false,
    coursera: false,
    linkedin: false,
    naukri: false,
  });

  const [accountData, setAccountData] = useState({});
  const [providerLoading, setProviderLoading] = useState({
    github: true,
    leetcode: true,
    freecodecamp: true,
    geeksforgeeks: true,
    nptel: true,
    coursera: true,
    linkedin: true,
    naukri: false,
  });
  const [connecting, setConnecting] = useState("");
  const inFlightRequests = useRef(new Set());

  const platforms = [
    {
      key: "github",
      name: "GitHub",
      short: "GH",
      description:
        "Repositories, commits, pull requests, issues and verified coding activity.",
      endpoint: "/github/status",
      connectEndpoint: "/github/login",
      disconnectEndpoint: "/github/disconnect",
      usernameFields: ["username", "login", "github_username"],
      gradient: "from-gray-900 via-gray-800 to-gray-700",
      icon: "🐙",
      type: "oauth",
      syncMode: "AUTOMATIC API",
      syncBadge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      capabilityNote: "Authenticated OAuth & Events API",
    },
    {
      key: "leetcode",
      name: "LeetCode",
      short: "LC",
      description:
        "Problem solving, algorithm solves, and competitive programming progress.",
      endpoint: "/leetcode/status",
      connectEndpoint: "/leetcode/connect",
      disconnectEndpoint: "/leetcode/disconnect",
      usernameFields: ["username", "leetcode_username"],
      gradient: "from-orange-500 to-amber-500",
      icon: "💻",
      type: "username",
      syncMode: "AUTOMATIC (PUBLIC)",
      syncBadge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
      capabilityNote: "Public GraphQL Submissions & Solves",
    },
    {
      key: "freecodecamp",
      name: "freeCodeCamp",
      short: "FCC",
      description:
        "Curriculum milestones, certifications and web development progress.",
      endpoint: "/freecodecamp/status",
      connectEndpoint: "/freecodecamp/connect",
      disconnectEndpoint: "/freecodecamp/disconnect",
      usernameFields: ["username", "freecodecamp_username"],
      gradient: "from-gray-800 to-gray-600",
      icon: "🔥",
      type: "username",
      syncMode: "AUTOMATIC (PUBLIC)",
      syncBadge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
      capabilityNote: "Public Profile API & Certifications",
    },
    {
      key: "geeksforgeeks",
      name: "GeeksforGeeks",
      short: "GFG",
      description:
        "Programming challenges, coding scores, and DSA practice profile.",
      endpoint: "/geeksforgeeks/status",
      connectEndpoint: "/geeksforgeeks/connect",
      disconnectEndpoint: "/geeksforgeeks/disconnect",
      usernameFields: ["username", "gfg_username"],
      gradient: "from-green-600 to-emerald-500",
      icon: "🟢",
      type: "username",
      syncMode: "AUTOMATIC (PUBLIC)",
      syncBadge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
      capabilityNote: "Public Profile Metrics & Scores",
    },
    {
      key: "coursera",
      name: "Coursera",
      short: "CO",
      description:
        "Course completions and certificates. No open consumer event API available; manual course tracking supported.",
      endpoint: "/coursera/status",
      connectEndpoint: "/coursera/connect",
      disconnectEndpoint: "/coursera/disconnect",
      usernameFields: ["username", "coursera_username"],
      gradient: "from-blue-600 to-cyan-500",
      icon: "📚",
      type: "username",
      syncMode: "MANUAL ONLY",
      syncBadge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      capabilityNote: "Manual Course & Certificate Logging",
    },
    {
      key: "nptel",
      name: "NPTEL",
      short: "NPTEL",
      description:
        "Academic courses and certification tracking. No public API without institutional SSO; manual tracking supported.",
      endpoint: "/nptel/status",
      connectEndpoint: "/nptel/connect",
      disconnectEndpoint: "/nptel/disconnect",
      usernameFields: ["username", "nptel_username"],
      gradient: "from-blue-700 to-indigo-600",
      icon: "🎓",
      type: "username",
      syncMode: "MANUAL ONLY",
      syncBadge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      capabilityNote: "Manual Course Progress Tracking",
    },
    {
      key: "linkedin",
      name: "LinkedIn",
      short: "IN",
      description:
        "Professional identity and network profile. Open activity feed is restricted by LinkedIn; career milestones logged manually.",
      endpoint: "/linkedin/status",
      connectEndpoint: "/linkedin/connect",
      disconnectEndpoint: "/linkedin/disconnect",
      usernameFields: ["username", "linkedin_username"],
      gradient: "from-blue-700 to-sky-700",
      icon: "💼",
      type: "username",
      syncMode: "PROFILE ACCESS ONLY",
      syncBadge: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      capabilityNote: "Connected ≠ Automatically tracked (Manual Career Activity)",
    },
    {
      key: "naukri",
      name: "Naukri",
      short: "NK",
      description:
        "Job search and recruiter tracking. No public jobseeker API available; applications & interviews tracked via Career Activity.",
      gradient: "from-amber-600 to-orange-500",
      icon: "👔",
      type: "manual_info",
      syncMode: "MANUAL ONLY",
      syncBadge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      capabilityNote: "Manual Applications & Interview Logging",
    },
  ];

  const [oauthBanner, setOauthBanner] = useState(null);

  // =====================================================
  // INDEPENDENT PARALLEL PROVIDER STATUS FETCHING
  // =====================================================

  const fetchSingleProvider = useCallback(async (platform) => {
    if (!platform.endpoint) return;
    if (inFlightRequests.current.has(platform.key)) return;

    inFlightRequests.current.add(platform.key);
    setProviderLoading((prev) => ({ ...prev, [platform.key]: true }));

    try {
      const response = await API.get(platform.endpoint);
      const isConnected = !!response.data?.connected;
      const responseData = response.data;
      const extractedData =
        responseData[platform.key] ||
        responseData.github ||
        responseData.leetcode ||
        responseData.freecodecamp ||
        responseData.geeksforgeeks ||
        responseData.nptel ||
        responseData.coursera ||
        responseData.linkedin ||
        responseData ||
        {};

      setConnections((prev) => ({ ...prev, [platform.key]: isConnected }));
      setAccountData((prev) => ({ ...prev, [platform.key]: extractedData }));
    } catch (err) {
      console.warn(`Status check for ${platform.name} completed with non-connected fallback:`, err.message);
      setConnections((prev) => ({ ...prev, [platform.key]: false }));
    } finally {
      inFlightRequests.current.delete(platform.key);
      setProviderLoading((prev) => ({ ...prev, [platform.key]: false }));
    }
  }, []);

  const checkAllConnections = useCallback(() => {
    const endpointsToFetch = platforms.filter((p) => p.endpoint);
    // Fire all requests completely independently in parallel
    endpointsToFetch.forEach((platform) => {
      fetchSingleProvider(platform);
    });
  }, [fetchSingleProvider]);

  // =====================================================
  // CHECK URL CALLBACK PARAMS & INITIAL PARALLEL STATUS
  // =====================================================

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const githubParam = searchParams.get("github");
    const messageParam = searchParams.get("message");
    const usernameParam = searchParams.get("username");

    if (githubParam === "connected") {
      setOauthBanner({
        type: "success",
        message: usernameParam
          ? `GitHub account @${usernameParam} successfully connected!`
          : "GitHub account successfully authenticated and connected!",
      });
      window.history.replaceState({}, document.title, window.location.pathname + "?tab=connected");
    } else if (githubParam === "relinked") {
      setOauthBanner({
        type: "success",
        message: usernameParam
          ? `GitHub account @${usernameParam} successfully verified and re-linked to your account!`
          : (messageParam ? decodeURIComponent(messageParam) : "GitHub account successfully verified and re-linked!"),
      });
      window.history.replaceState({}, document.title, window.location.pathname + "?tab=connected");
    } else if (githubParam === "error") {
      setOauthBanner({
        type: "error",
        message: messageParam ? decodeURIComponent(messageParam) : "GitHub connection failed.",
      });
      window.history.replaceState({}, document.title, window.location.pathname + "?tab=connected");
    } else if (githubParam === "cancelled") {
      setOauthBanner({
        type: "info",
        message: "GitHub authorization was cancelled.",
      });
      window.history.replaceState({}, document.title, window.location.pathname + "?tab=connected");
    }

    checkAllConnections();
  }, [checkAllConnections]);

  // =====================================================
  // GITHUB OAUTH
  // =====================================================

  const connectGithub = async () => {
    try {
      setConnecting("github");
      const response = await API.get("/github/login");
      const authorizationUrl = response.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error("GitHub authorization URL was not received from server.");
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.error("GitHub connection initiation error:", error);
      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again to connect your GitHub account.");
        window.location.href = "/login";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        alert("Connecting to server timed out while backend was waking up. Please try connecting again.");
      } else {
        alert(error.response?.data?.detail || error.message || "Unable to initiate GitHub connection. Please try again.");
      }
      setConnecting("");
    }
  };

  // =====================================================
  // USERNAME BASED PLATFORMS
  // =====================================================

  const connectUsernamePlatform = async (platform) => {
    const promptMsg =
      platform.key === "linkedin"
        ? "Enter your LinkedIn username or public profile handle (e.g. keerthivasan-dev):"
        : `Enter your ${platform.name} username:`;

    const username = window.prompt(promptMsg);

    if (!username || !username.trim()) {
      return;
    }

    try {
      setConnecting(platform.key);

      await API.post(platform.connectEndpoint, null, {
        params: {
          username: username.trim(),
        },
      });

      // Refresh just this provider immediately
      await fetchSingleProvider(platform);
      alert(`${platform.name} connected successfully!`);
    } catch (error) {
      console.error(`${platform.name} connection failed:`, error);
      alert(
        error.response?.data?.detail || `Unable to connect ${platform.name}.`
      );
    } finally {
      setConnecting("");
    }
  };

  // =====================================================
  // DISCONNECT PLATFORMS
  // =====================================================

  const handleDisconnect = async (platform) => {
    const confirmDisconnect = window.confirm(
      `Are you sure you want to disconnect ${platform.name}? Historical telemetry will be preserved.`
    );

    if (!confirmDisconnect) {
      return;
    }

    try {
      setConnecting(platform.key);

      if (platform.disconnectEndpoint) {
        await API.post(platform.disconnectEndpoint);
      }

      // Refresh just this provider immediately
      await fetchSingleProvider(platform);
      alert(`${platform.name} disconnected successfully.`);
    } catch (error) {
      console.error(`Failed to disconnect ${platform.name}:`, error);
      alert(
        error.response?.data?.detail || `Failed to disconnect ${platform.name}.`
      );
    } finally {
      setConnecting("");
    }
  };

  const handleConnect = (platform) => {
    if (platform.type === "oauth") {
      connectGithub();
    } else if (platform.type === "username") {
      connectUsernamePlatform(platform);
    }
  };

  const getUsername = (platform) => {
    const data = accountData[platform.key];
    if (!data) return "";

    for (const field of platform.usernameFields || []) {
      if (data[field]) return String(data[field]);
    }
    return String(data.username || data.login || "");
  };

  const connectedCount = Object.values(connections).filter(Boolean).length;
  const isAnyLoading = Object.values(providerLoading).some(Boolean);
  const progress = (connectedCount / platforms.length) * 100;

  return (
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* HEADER HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-5 sm:px-8 py-8 sm:py-10">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-blue-200 text-xs font-semibold mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Developer Ecosystem & Platform Connections
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Connected Accounts
              </h2>
              <p className="text-slate-300 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
                Connect your coding, problem solving, learning, and career platforms to build a verified developer productivity graph.
              </p>
            </div>

            <button
              onClick={checkAllConnections}
              disabled={isAnyLoading}
              className="self-start lg:self-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium backdrop-blur-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <span className={isAnyLoading ? "animate-spin" : ""}>↻</span>
              <span>{isAnyLoading ? "Checking..." : "Refresh All"}</span>
            </button>
          </div>

          {/* SUMMARY TILES */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
            <div className="rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
              <p className="text-xs text-slate-400">Connected Platforms</p>
              <p className="text-2xl font-bold text-white mt-1">
                {connectedCount}
                <span className="text-sm text-slate-400 font-normal"> / {platforms.length}</span>
              </p>
            </div>

            <div className="rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm p-4">
              <p className="text-xs text-slate-400">Supported Providers</p>
              <p className="text-2xl font-bold text-white mt-1">{platforms.length}</p>
            </div>

            <div className="rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-400">Telemetry Categories</p>
              <p className="text-xs font-bold text-white mt-2 leading-relaxed">
                Coding • DSA • Learning • Career
              </p>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">Ecosystem Coverage</span>
              <span className="text-blue-300 font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PLATFORM CARDS */}
      <div className="p-5 sm:p-8">
        {oauthBanner && (
          <div
            className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-sm transition-all shadow-xs ${
              oauthBanner.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : oauthBanner.type === "error"
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {oauthBanner.type === "success" ? "✅" : oauthBanner.type === "error" ? "⚠️" : "ℹ️"}
              </span>
              <span className="font-semibold">{oauthBanner.message}</span>
            </div>
            <button
              onClick={() => setOauthBanner(null)}
              className="text-xs font-bold px-3 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-current opacity-80 hover:opacity-100 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {platforms.map((platform) => {
            const isLoading = providerLoading[platform.key];
            const connected = connections[platform.key];
            const isConnecting = connecting === platform.key;
            const username = getUsername(platform);
            const data = accountData[platform.key];

            return (
              <div
                key={platform.key}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className={`h-1.5 bg-gradient-to-r ${platform.gradient}`} />

                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shadow-md text-white shrink-0`}
                        >
                          {platform.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                            {platform.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            {isLoading ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                                <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
                                Checking...
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    connected
                                      ? "bg-emerald-500"
                                      : platform.type === "manual_info"
                                      ? "bg-amber-400"
                                      : "bg-slate-300 dark:bg-slate-600"
                                  }`}
                                />
                                <span
                                  className={`text-xs font-semibold ${
                                    connected
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : platform.type === "manual_info"
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                >
                                  {connected
                                    ? "Connected"
                                    : platform.type === "manual_info"
                                    ? "Manual Tracking"
                                    : "Not connected"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${platform.syncBadge}`}
                      >
                        {platform.syncMode}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-5 mt-4 min-h-[48px]">
                      {platform.description}
                    </p>

                    <div className="mt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 rounded-xl p-2.5">
                      <span>Capability: </span>
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">{platform.capabilityNote}</strong>
                    </div>

                    {/* CONNECTED ACCOUNT PROFILE DETAILS */}
                    {connected && (
                      <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                          Verified Profile
                        </p>
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                            {username ? `@${username.replace(/^@/, "")}` : "Account Connected"}
                          </p>
                          {(() => {
                            let profileUrl = data?.profile_url;
                            if (!profileUrl && username) {
                              const cleanUser = username.replace(/^@/, "").trim();
                              if (platform.key === "github") profileUrl = `https://github.com/${cleanUser}`;
                              else if (platform.key === "leetcode") profileUrl = `https://leetcode.com/u/${cleanUser}/`;
                              else if (platform.key === "geeksforgeeks") profileUrl = `https://www.geeksforgeeks.org/user/${cleanUser}/`;
                              else if (platform.key === "freecodecamp") profileUrl = `https://www.freecodecamp.org/${cleanUser}`;
                              else if (platform.key === "linkedin") profileUrl = `https://www.linkedin.com/in/${cleanUser}/`;
                            }

                            if (profileUrl && typeof profileUrl === "string" && profileUrl.startsWith("http")) {
                              return (
                                <a
                                  href={profileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold whitespace-nowrap cursor-pointer"
                                >
                                  View Profile ↗
                                </a>
                              );
                            }

                            return (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                {platform.type === "manual_info" || platform.syncMode?.includes("MANUAL")
                                  ? "Manual tracking"
                                  : "Profile verified"}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTON */}
                <div className="p-5 sm:p-6 pt-0">
                  {platform.type === "manual_info" ? (
                    <a
                      href="/activity"
                      className="block text-center w-full py-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 font-semibold text-xs transition cursor-pointer"
                    >
                      Log in Career Activity Hub →
                    </a>
                  ) : connected ? (
                    <button
                      onClick={() => handleDisconnect(platform)}
                      disabled={isConnecting || isLoading}
                      className="w-full py-2.5 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      {isConnecting ? "Disconnecting..." : "Disconnect Account"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      disabled={isConnecting || isLoading}
                      className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${platform.gradient} text-white font-semibold text-xs shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5`}
                    >
                      <span>{isConnecting ? "Connecting..." : `Connect ${platform.name}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Companion Extension Hub */}
        <div className="mt-10 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-indigo-800/50">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                <span>🛡️ Browser Extension Companion</span>
                <span>•</span>
                <span>Privacy-First & Consent-First</span>
              </div>
              <h3 className="text-xl font-black text-white">Browser Activity Extension</h3>
              <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
                Automatically logs active time across 8 supported platforms with strict idle detection and zero scraping. Disabled by default until you grant consent in the extension popup.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/activity"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <span>View Activity Feed</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-indigo-800/40 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
              <p className="font-bold text-white mb-1">Strict Domain Whitelist</p>
              <p className="text-[11px] text-indigo-200/70">Only tracks GitHub, LeetCode, Coursera, NPTEL, GeeksforGeeks, freeCodeCamp, LinkedIn & Naukri.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
              <p className="font-bold text-white mb-1">Zero Page Scraping</p>
              <p className="text-[11px] text-indigo-200/70">Never reads passwords, cookies, auth tokens, form inputs, private messages, or DOM text.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
              <p className="font-bold text-white mb-1">Offline Resilient Queue</p>
              <p className="text-[11px] text-indigo-200/70">Buffers activity locally in Chrome storage and flushes securely to Unified Activity Engine upon connection.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectedAccounts;