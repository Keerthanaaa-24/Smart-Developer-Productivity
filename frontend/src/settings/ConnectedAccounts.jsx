import { useEffect, useState, useRef, useCallback } from "react";
import API from "../api/axios";
import { syncSinglePlatformActivity } from "../api/activityApi";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSync,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaShieldAlt,
  FaClock,
  FaLink,
  FaUnlink,
} from "react-icons/fa";

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
  const [syncingProvider, setSyncingProvider] = useState("");
  const [selectedCapabilityModal, setSelectedCapabilityModal] = useState(null);
  const inFlightRequests = useRef(new Set());

  const platforms = [
    {
      key: "github",
      name: "GitHub",
      short: "GH",
      website: "https://github.com",
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
      capabilityNote: "Authenticated OAuth 2.0 & Events API",
      dataCategories: ["Repositories", "Commits", "Pull Requests", "Contribution Calendar"],
      unsupported: ["Direct time tracking (discrete events)", "Private enterprise servers without tunnel"],
      supportsSync: true,
    },
    {
      key: "leetcode",
      name: "LeetCode",
      short: "LC",
      website: "https://leetcode.com",
      description:
        "Problem solving, algorithm solves, difficulty breakdown, and competitive programming progress.",
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
      dataCategories: ["Solved Algorithms", "Easy/Med/Hard Breakdown", "Contest Rating", "Recent Submissions"],
      unsupported: ["Private contest solutions", "Solving time per question"],
      supportsSync: true,
    },
    {
      key: "freecodecamp",
      name: "freeCodeCamp",
      short: "FCC",
      website: "https://www.freecodecamp.org",
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
      dataCategories: ["Curriculum Points", "Verified Certifications", "Challenge Milestones"],
      unsupported: ["Private mode profiles", "Article reading duration"],
      supportsSync: true,
    },
    {
      key: "geeksforgeeks",
      name: "GeeksforGeeks",
      short: "GFG",
      website: "https://www.geeksforgeeks.org",
      description:
        "Programming challenges, coding scores, articles, and DSA practice profile.",
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
      dataCategories: ["Coding Score", "Problems Solved", "Published Articles", "Courses Completed"],
      unsupported: ["Institutional private contest ranks", "Course video timestamps"],
      supportsSync: true,
    },
    {
      key: "coursera",
      name: "Coursera",
      short: "CO",
      website: "https://www.coursera.org",
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
      dataCategories: ["Courses Completed", "Certificates Earned", "Courses in Progress"],
      unsupported: ["Automatic consumer event API without enterprise LMS SSO", "Video playback tracking"],
      supportsSync: false,
    },
    {
      key: "nptel",
      name: "NPTEL",
      short: "NPTEL",
      website: "https://nptel.ac.in",
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
      dataCategories: ["Academic Courses", "Certificates", "Study Session Logs"],
      unsupported: ["Automated assignment grading without SWAYAM institutional SSO"],
      supportsSync: false,
    },
    {
      key: "linkedin",
      name: "LinkedIn",
      short: "IN",
      website: "https://www.linkedin.com",
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
      dataCategories: ["Profile Identity", "Job Application Pipeline", "Interview Milestones"],
      unsupported: ["Open activity feed reading (restricted by LinkedIn Developer policies)"],
      supportsSync: false,
    },
    {
      key: "naukri",
      name: "Naukri",
      short: "NK",
      website: "https://www.naukri.com",
      description:
        "Job search and recruiter tracking. No public jobseeker API available; applications & interviews tracked via Career Activity.",
      gradient: "from-amber-600 to-orange-500",
      icon: "👔",
      type: "manual_info",
      syncMode: "MANUAL ONLY",
      syncBadge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      capabilityNote: "Manual Applications & Interview Logging",
      dataCategories: ["Job Applications", "Interview Rounds", "Recruiter Milestones"],
      unsupported: ["Direct scraping of jobseeker credentials or automated application pulling"],
      supportsSync: false,
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
      console.warn(`Status check for ${platform.name} completed:`, err.message);
      setConnections((prev) => ({ ...prev, [platform.key]: false }));
    } finally {
      inFlightRequests.current.delete(platform.key);
      setProviderLoading((prev) => ({ ...prev, [platform.key]: false }));
    }
  }, []);

  const checkAllConnections = useCallback(() => {
    const endpointsToFetch = platforms.filter((p) => p.endpoint);
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

    const handleBackendWarmed = () => {
      checkAllConnections();
    };

    window.addEventListener("backend-warmed", handleBackendWarmed);
    return () => {
      window.removeEventListener("backend-warmed", handleBackendWarmed);
    };
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

  const handleSync = async (platformKey) => {
    try {
      setSyncingProvider(platformKey);
      const res = await syncSinglePlatformActivity(platformKey);
      alert(res.message || `${platformKey} synced successfully!`);
      const targetPlatform = platforms.find((p) => p.key === platformKey);
      if (targetPlatform) {
        await fetchSingleProvider(targetPlatform);
      }
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to sync ${platformKey}`);
    } finally {
      setSyncingProvider("");
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

  const getSafeDestinationUrl = (platform, username, storedUrl) => {
    if (storedUrl && typeof storedUrl === "string" && storedUrl.startsWith("http")) {
      return storedUrl;
    }
    if (username) {
      const cleanUser = username.replace(/^@/, "").trim();
      if (platform.key === "github") return `https://github.com/${cleanUser}`;
      if (platform.key === "leetcode") return `https://leetcode.com/u/${cleanUser}/`;
      if (platform.key === "geeksforgeeks") return `https://www.geeksforgeeks.org/user/${cleanUser}/`;
      if (platform.key === "freecodecamp") return `https://www.freecodecamp.org/${cleanUser}`;
      if (platform.key === "linkedin") return `https://www.linkedin.com/in/${cleanUser}/`;
    }
    return platform.website || "https://github.com";
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={checkAllConnections}
                disabled={isAnyLoading}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium backdrop-blur-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <span className={isAnyLoading ? "animate-spin" : ""}>↻</span>
                <span>{isAnyLoading ? "Checking..." : "Refresh Status"}</span>
              </button>
            </div>
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
            const isSyncing = syncingProvider === platform.key;
            const username = getUsername(platform);
            const data = accountData[platform.key];
            const destinationUrl = getSafeDestinationUrl(platform, username, data?.profile_url);

            return (
              <div
                key={platform.key}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
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
                                      : platform.type === "manual_info" || platform.syncMode?.includes("MANUAL")
                                      ? "bg-amber-400"
                                      : "bg-slate-300 dark:bg-slate-600"
                                  }`}
                                />
                                <span
                                  className={`text-xs font-semibold ${
                                    connected
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : platform.type === "manual_info" || platform.syncMode?.includes("MANUAL")
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  }`}
                                >
                                  {connected
                                    ? "Connected"
                                    : platform.type === "manual_info" || platform.syncMode?.includes("MANUAL")
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

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-5 mt-4 min-h-[44px]">
                      {platform.description}
                    </p>

                    {/* DATA CATEGORIES BADGES */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {platform.dataCategories?.map((cat, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* CONNECTED ACCOUNT PROFILE DETAILS & NAVIGATION */}
                    <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                            {connected ? "Verified Profile" : "Official Website"}
                          </p>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                            {connected && username ? `@${username.replace(/^@/, "")}` : platform.name}
                          </p>
                        </div>

                        <a
                          href={destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <FaExternalLinkAlt className="text-[9px]" />
                          <span>{connected ? "View Profile" : "Official Site"} ↗</span>
                        </a>
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                        <button
                          onClick={() => setSelectedCapabilityModal(platform)}
                          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <FaInfoCircle className="text-[10px]" />
                          <span>View Capabilities</span>
                        </button>

                        {platform.supportsSync && connected && (
                          <button
                            onClick={() => handleSync(platform.key)}
                            disabled={isSyncing}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                          >
                            <FaSync className={isSyncing ? "animate-spin text-[10px]" : "text-[10px]"} />
                            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
                          </button>
                        )}
                      </div>
                    </div>
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
                      className="w-full py-2.5 rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 font-semibold text-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FaUnlink className="text-[11px]" />
                      <span>{isConnecting ? "Disconnecting..." : "Disconnect Account"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      disabled={isConnecting || isLoading}
                      className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${platform.gradient} text-white font-semibold text-xs shadow-sm hover:shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5`}
                    >
                      <FaLink className="text-[11px]" />
                      <span>{isConnecting ? "Connecting..." : `Connect ${platform.name}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CAPABILITY REGISTRY MODAL */}
      {selectedCapabilityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCapabilityModal.icon}</span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {selectedCapabilityModal.name} Integration
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Capability Specifications & Scope Details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCapabilityModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Supported Telemetry Data:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCapabilityModal.dataCategories?.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Restrictions & Boundaries:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  {selectedCapabilityModal.unsupported?.map((item, idx) => (
                    <li key={idx} className="text-amber-700 dark:text-amber-400">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-slate-200">Official Website & Dashboard:</p>
                <a
                  href={selectedCapabilityModal.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all mt-0.5 inline-block font-semibold"
                >
                  {selectedCapabilityModal.website} ↗
                </a>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCapabilityModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedAccounts;