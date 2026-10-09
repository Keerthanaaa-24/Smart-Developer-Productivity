import { useState, useEffect, useCallback, useMemo } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  getActivities,
  getActivitySummary,
  getSyncStatus,
  getCareerSummary,
  getCareerApplications,
  logCareerApplication,
  updateCareerApplication,
  deleteActivity,
  recordManualActivity,
  syncPlatformActivities,
  exportActivityData,
} from "../api/activityApi";
import {
  FaBolt,
  FaSync,
  FaPlus,
  FaFilter,
  FaCode,
  FaBrain,
  FaBookOpen,
  FaStopwatch,
  FaBriefcase,
  FaCheckCircle,
  FaTimes,
  FaCalendarAlt,
  FaTasks,
  FaLayerGroup,
  FaInfoCircle,
  FaTrash,
  FaUserTie,
  FaHandshake,
  FaFileAlt,
  FaClipboardCheck,
  FaSearch,
  FaTrophy,
  FaChevronRight,
  FaEdit,
  FaExternalLinkAlt,
  FaGraduationCap,
  FaCheck,
  FaArrowRight,
  FaDownload,
  FaShieldAlt,
} from "react-icons/fa";

const CATEGORY_COLORS = {
  coding: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  problem_solving: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  learning: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  productivity: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  career: "bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  other: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

const SOURCE_BADGES = {
  github_api: { label: "GitHub OAuth", style: "bg-slate-900 text-white" },
  leetcode_api: { label: "LeetCode API", style: "bg-amber-600 text-white" },
  freecodecamp_api: { label: "freeCodeCamp", style: "bg-slate-800 text-white" },
  geeksforgeeks_api: { label: "GeeksforGeeks", style: "bg-emerald-700 text-white" },
  pomodoro_timer: { label: "Pomodoro Focus", style: "bg-purple-600 text-white" },
  task_system: { label: "Task System", style: "bg-blue-600 text-white" },
  manual_career_tracker: { label: "Career Tracker", style: "bg-pink-600 text-white" },
  manual: { label: "Manual Entry", style: "bg-slate-600 text-white" },
  browser_extension: { label: "VS Code / Ext", style: "bg-indigo-600 text-white" },
  automatic: { label: "Auto Sync", style: "bg-slate-700 text-white" },
};

const PIPELINE_STAGES = [
  { key: "saved", label: "Saved", color: "border-slate-300 bg-slate-50 text-slate-700", dot: "bg-slate-400" },
  { key: "applied", label: "Applied", color: "border-blue-300 bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  { key: "assessment", label: "Assessment", color: "border-cyan-300 bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
  { key: "interview", label: "Interview", color: "border-purple-300 bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  { key: "offer", label: "Offer", color: "border-emerald-300 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { key: "rejected", label: "Rejected / Withdrawn", color: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-400" },
];

const Activity = () => {
  const [summary, setSummary] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [careerSummary, setCareerSummary] = useState(null);
  const [careerPipeline, setCareerPipeline] = useState(null);
  const [activities, setActivities] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  // Smart Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [datePreset, setDatePreset] = useState("all"); // all, today, 7d, 30d, custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedPipelineStage, setSelectedPipelineStage] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    platform: "coursera",
    category: "learning",
    title: "",
    description: "",
    durationMinutes: 30,
    activityDate: new Date().toISOString().split("T")[0],
  });
  const [submittingManual, setSubmittingManual] = useState(false);

  // Career Milestone Modal
  const [showCareerModal, setShowCareerModal] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState(null);
  const [careerForm, setCareerForm] = useState({
    company: "",
    role: "",
    stage: "applied",
    platform: "linkedin",
    applicationDate: new Date().toISOString().split("T")[0],
    interviewDate: "",
    notes: "",
  });
  const [submittingCareer, setSubmittingCareer] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute date range based on preset
  const { startDateVal, endDateVal } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (datePreset === "today") {
      return { startDateVal: todayStr, endDateVal: todayStr };
    } else if (datePreset === "7d") {
      const d = new Date(today);
      d.setDate(today.getDate() - 6);
      return { startDateVal: d.toISOString().split("T")[0], endDateVal: todayStr };
    } else if (datePreset === "30d") {
      const d = new Date(today);
      d.setDate(today.getDate() - 29);
      return { startDateVal: d.toISOString().split("T")[0], endDateVal: todayStr };
    } else if (datePreset === "custom") {
      return { startDateVal: customStartDate || null, endDateVal: customEndDate || null };
    }
    return { startDateVal: null, endDateVal: null };
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch summaries once or on sync/mutation
  const fetchSummaries = useCallback(async () => {
    try {
      const [sumData, statusData, careerData, pipelineData] = await Promise.all([
        getActivitySummary().catch(() => null),
        getSyncStatus().catch(() => null),
        getCareerSummary().catch(() => null),
        getCareerApplications().catch(() => null),
      ]);
      if (sumData) setSummary(sumData);
      if (statusData) setSyncStatus(statusData);
      if (careerData) setCareerSummary(careerData);
      if (pipelineData) setCareerPipeline(pipelineData);
    } catch (err) {
      console.warn("Non-blocking summary load warning:", err);
    }
  }, []);

  // Fetch paginated activities list
  const fetchActivitiesList = useCallback(async () => {
    setLoading(true);
    try {
      const actData = await getActivities({
        limit: pageSize,
        offset: page * pageSize,
        category: selectedCategory,
        platform: selectedPlatform,
        startDate: startDateVal,
        endDate: endDateVal,
        search: debouncedSearch,
      });

      let rawActs = actData?.activities || [];
      if (selectedSource !== "all") {
        rawActs = rawActs.filter((a) => {
          if (selectedSource === "automatic") return a.source?.includes("api") || a.source === "automatic";
          if (selectedSource === "pomodoro") return a.source?.includes("pomodoro");
          if (selectedSource === "manual") return a.source?.includes("manual");
          return true;
        });
      }
      setActivities(rawActs);
      setTotalCount(actData?.total || 0);
    } catch (err) {
      console.error("Failed to load activities list:", err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, selectedPlatform, selectedSource, startDateVal, endDateVal, debouncedSearch]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  useEffect(() => {
    fetchActivitiesList();
  }, [fetchActivitiesList]);

  useEffect(() => {
    const handleBackendWarmed = () => {
      fetchSummaries();
      fetchActivitiesList();
    };

    window.addEventListener("backend-warmed", handleBackendWarmed);
    return () => {
      window.removeEventListener("backend-warmed", handleBackendWarmed);
    };
  }, [fetchSummaries, fetchActivitiesList]);

  const handleSync = async () => {
    setSyncing(true);
    setToast(null);
    try {
      const res = await syncPlatformActivities();
      const totalNew = res.total_new_activities || res.results?.github?.new_recorded || 0;
      setToast({
        type: "success",
        message: `Platform synchronization complete! ${totalNew} new activity record(s) processed.`,
      });
      fetchSummaries();
      fetchActivitiesList();
    } catch (err) {
      setToast({
        type: "error",
        message: "Failed to synchronize connected platforms. Please verify OAuth connection in Settings.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async (format = "json") => {
    try {
      setToast({ type: "warning", message: `Preparing ${format.toUpperCase()} telemetry export...` });
      const exportData = await exportActivityData(format);

      if (format === "csv") {
        const url = window.URL.createObjectURL(new Blob([exportData]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `developer_activity_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(exportData, null, 2)
        )}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute(
          "download",
          `developer_activity_${new Date().toISOString().split("T")[0]}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }

      setToast({
        type: "success",
        message: `Activity telemetry exported successfully (${format.toUpperCase()}).`,
      });
    } catch (err) {
      setToast({
        type: "error",
        message: "Failed to export activity telemetry data.",
      });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedCategory("all");
    setSelectedPlatform("all");
    setSelectedSource("all");
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedPipelineStage("all");
    setPage(0);
  };

  // Career Application Submission
  const handleCareerSubmit = async (e) => {
    e.preventDefault();
    if (!careerForm.company.trim() || !careerForm.role.trim()) return;
    setSubmittingCareer(true);

    try {
      if (editingApplicationId) {
        await updateCareerApplication(editingApplicationId, {
          company: careerForm.company.trim(),
          role: careerForm.role.trim(),
          stage: careerForm.stage,
          platform: careerForm.platform,
          applicationDate: careerForm.applicationDate || null,
          interviewDate: careerForm.interviewDate || null,
          notes: careerForm.notes || null,
        });
        setToast({ type: "success", message: "Career milestone updated successfully!" });
      } else {
        await logCareerApplication({
          company: careerForm.company.trim(),
          role: careerForm.role.trim(),
          stage: careerForm.stage,
          platform: careerForm.platform,
          applicationDate: careerForm.applicationDate || null,
          interviewDate: careerForm.interviewDate || null,
          notes: careerForm.notes || null,
        });
        setToast({ type: "success", message: "Career milestone logged successfully!" });
      }

      setShowCareerModal(false);
      setEditingApplicationId(null);
      setCareerForm({
        company: "",
        role: "",
        stage: "applied",
        platform: "linkedin",
        applicationDate: new Date().toISOString().split("T")[0],
        interviewDate: "",
        notes: "",
      });
      fetchSummaries();
      fetchActivitiesList();
    } catch (err) {
      setToast({ type: "error", message: "Failed to save career milestone." });
    } finally {
      setSubmittingCareer(false);
    }
  };

  const handleOpenEditCareer = (app) => {
    setEditingApplicationId(app.id);
    setCareerForm({
      company: app.company,
      role: app.role,
      stage: app.stage || "applied",
      platform: app.platform || "linkedin",
      applicationDate: app.application_date || new Date().toISOString().split("T")[0],
      interviewDate: app.interview_date || "",
      notes: app.notes || "",
    });
    setShowCareerModal(true);
  };

  const handleOpenNewCareer = () => {
    setEditingApplicationId(null);
    setCareerForm({
      company: "",
      role: "",
      stage: "applied",
      platform: "linkedin",
      applicationDate: new Date().toISOString().split("T")[0],
      interviewDate: "",
      notes: "",
    });
    setShowCareerModal(true);
  };

  // General Manual Activity Submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.title.trim()) return;
    setSubmittingManual(true);

    try {
      await recordManualActivity({
        platform: manualForm.platform,
        category: manualForm.category,
        title: manualForm.title.trim(),
        description: manualForm.description.trim(),
        durationMinutes: parseInt(manualForm.durationMinutes, 10) || 0,
        activityDate: manualForm.activityDate || null,
      });

      setShowManualModal(false);
      setManualForm({
        platform: "coursera",
        category: "learning",
        title: "",
        description: "",
        durationMinutes: 30,
        activityDate: new Date().toISOString().split("T")[0],
      });
      setToast({ type: "success", message: "Activity record saved successfully!" });
      fetchSummaries();
      fetchActivitiesList();
    } catch (err) {
      setToast({ type: "error", message: "Failed to save activity record." });
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm("Are you sure you want to delete this activity record?")) return;
    try {
      await deleteActivity(id);
      setToast({ type: "success", message: "Activity record deleted." });
      fetchSummaries();
      fetchActivitiesList();
    } catch (err) {
      setToast({ type: "error", message: "Failed to delete activity record." });
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Platform synchronization list
  const platformsList = [
    {
      key: "github",
      name: "GitHub",
      icon: "🐙",
      mode: "AUTOMATIC OAUTH",
      category: "coding",
      badgeClass: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
      description: "Authenticated OAuth Commits & PRs",
      connected: Boolean(syncStatus?.platforms?.github?.connected ?? true),
    },
    {
      key: "leetcode",
      name: "LeetCode",
      icon: "💻",
      mode: "PUBLIC GRAPHQL",
      category: "problem_solving",
      badgeClass: "bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700",
      description: "Solved Problems & Submissions",
      connected: Boolean(syncStatus?.platforms?.leetcode?.connected ?? true),
    },
    {
      key: "pomodoro",
      name: "Pomodoro Focus",
      icon: "⏱️",
      mode: "BUILT-IN TIMER",
      category: "productivity",
      badgeClass: "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700",
      description: "Deep Work Interval Engine",
      connected: true,
    },
    {
      key: "tasks",
      name: "Task System",
      icon: "📋",
      mode: "BUILT-IN TASKS",
      category: "productivity",
      badgeClass: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
      description: "Milestone & Task Tracking",
      connected: true,
    },
    {
      key: "geeksforgeeks",
      name: "GeeksforGeeks",
      icon: "🟢",
      mode: "PROFILE TELEMETRY",
      category: "problem_solving",
      badgeClass: "bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700",
      description: "Coding Scores & Problem Solves",
      connected: Boolean(syncStatus?.platforms?.geeksforgeeks?.connected ?? true),
    },
    {
      key: "freecodecamp",
      name: "freeCodeCamp",
      icon: "🔥",
      mode: "PROFILE TELEMETRY",
      category: "learning",
      badgeClass: "bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700",
      description: "Certifications & Curriculum",
      connected: Boolean(syncStatus?.platforms?.freecodecamp?.connected ?? true),
    },
    {
      key: "coursera",
      name: "Coursera",
      icon: "📚",
      mode: "MANUAL / USERNAME",
      category: "learning",
      badgeClass: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
      description: "Specializations & Course Tracking",
      connected: Boolean(syncStatus?.platforms?.coursera?.connected ?? false),
    },
    {
      key: "nptel",
      name: "NPTEL",
      icon: "🎓",
      mode: "MANUAL / USERNAME",
      category: "learning",
      badgeClass: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
      description: "IIT Academic Course Tracking",
      connected: Boolean(syncStatus?.platforms?.nptel?.connected ?? false),
    },
    {
      key: "linkedin",
      name: "LinkedIn",
      icon: "💼",
      mode: "CAREER TRACKER",
      category: "career",
      badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      description: "Profile access & job application logs",
      connected: Boolean(syncStatus?.platforms?.linkedin?.connected ?? false),
    },
    {
      key: "naukri",
      name: "Naukri",
      icon: "👔",
      mode: "CAREER TRACKER",
      category: "career",
      badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      description: "Job applications & recruiter logs",
      connected: false,
    },
  ];

  // Pipeline stage filtering
  const displayedApplications = useMemo(() => {
    if (!careerPipeline?.applications) return [];
    if (selectedPipelineStage === "all") return careerPipeline.applications;
    return careerPipeline.applications.filter((app) => app.stage === selectedPipelineStage);
  }, [careerPipeline, selectedPipelineStage]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-7 pb-16">

        {/* 1. HERO SECTION */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-7 sm:p-9 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                <FaBolt />
                <span>Automated Developer Telemetry</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Developer Activity Center
              </h1>

              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Your coding, learning, focus, and career progress — automatically collected and organized in one place.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="btn-sync-activity"
                onClick={handleSync}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 active:scale-95 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <FaSync className={`text-xs ${syncing ? "animate-spin" : ""}`} />
                <span>{syncing ? "Syncing..." : "Sync Activity"}</span>
              </button>

              <button
                id="btn-export-activity"
                onClick={() => handleExport("json")}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                title="Export all activity telemetry as JSON"
              >
                <FaDownload className="text-xs" />
                <span>Export</span>
              </button>

              <a
                href="/settings?tab=trust_center"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                title="View Data Trust Center and integration health"
              >
                <FaShieldAlt className="text-xs text-emerald-400" />
                <span>Trust Center</span>
              </a>

              <button
                id="btn-log-career-milestone"
                onClick={handleOpenNewCareer}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1.5"
              >
                <FaBriefcase className="text-xs" />
                <span>Career</span>
              </button>

              <button
                id="btn-log-activity"
                onClick={() => setShowManualModal(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs active:scale-95 transition cursor-pointer flex items-center gap-1.5"
              >
                <FaPlus className="text-xs" />
                <span>Log</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Toast Notification */}
        {toast && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold border transition-all animate-fadeIn ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : toast.type === "warning"
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <FaCheckCircle className="shrink-0 text-base text-emerald-600 dark:text-emerald-400" />
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
              <FaTimes />
            </button>
          </div>
        )}

        {/* 2. EXACTLY FOUR MAIN METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Coding Time */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base shadow-xs">
                  <FaCode />
                </div>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                  Coding Time
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verified Coding (Today)</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {summary?.today?.coding?.formatted || "0m"}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>{summary?.today?.coding?.count || 0} GitHub events today</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400 font-mono">7d: {summary?.weekly?.coding?.formatted || "0m"}</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Measured active sessions + commit events</p>
            </div>
          </div>

          {/* Card 2: Learning Time */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shadow-xs">
                  <FaBookOpen />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                  Learning Time
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verified Study & Solves (Today)</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {summary?.today?.learning?.formatted || "0m"}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>{summary?.today?.learning?.count || 0} modules / solves</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">7d: {summary?.weekly?.learning?.formatted || "0m"}</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Coursera, NPTEL, freeCodeCamp & DSA</p>
            </div>
          </div>

          {/* Card 3: Focus Time */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-base shadow-xs">
                  <FaStopwatch />
                </div>
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-100 dark:border-purple-800">
                  Focus Time
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pomodoro Deep Work (Today)</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {summary?.today?.focus?.formatted || "0m"}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>{summary?.today?.focus?.count || 0} completed sprints</span>
                <span className="font-semibold text-purple-700 dark:text-purple-400 font-mono">7d: {summary?.weekly?.focus?.formatted || "0m"}</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Persisted timer sessions truth source</p>
            </div>
          </div>

          {/* Card 4: Career Activity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl group-hover:bg-pink-500/10 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center text-base shadow-xs">
                  <FaBriefcase />
                </div>
                <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 rounded-full border border-pink-100 dark:border-pink-800">
                  Career Activity
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Applications & Milestones</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {careerSummary?.summary?.applications ?? summary?.career_metrics?.applications ?? 0}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>{careerSummary?.summary?.interviews ?? summary?.career_metrics?.interviews ?? 0} interviews</span>
                <span className="font-semibold text-pink-600 dark:text-pink-400">{careerSummary?.summary?.offers ?? summary?.career_metrics?.offers ?? 0} offers</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">LinkedIn, Naukri & company applications</p>
            </div>
          </div>

        </div>

        {/* 3. COMPACT CAREER MILESTONES PANEL */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center text-sm shadow-xs">
                <FaBriefcase />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Career Milestones</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Track job applications, interviews, and hiring progress</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenNewCareer}
                className="px-3.5 py-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/50 border border-pink-200 dark:border-pink-800/60 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <FaPlus className="text-[10px]" />
                <span>Log Milestone</span>
              </button>
            </div>
          </div>

          {/* Stage Filters & Counter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedPipelineStage("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                selectedPipelineStage === "all"
                  ? "bg-slate-900 dark:bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>All Stages</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {careerPipeline?.total || 0}
              </span>
            </button>

            {PIPELINE_STAGES.map((s) => {
              const count = careerPipeline?.pipeline?.[s.key]?.length || 0;
              const isSelected = selectedPipelineStage === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSelectedPipelineStage(isSelected ? "all" : s.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span>{s.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Applications Grid */}
          {displayedApplications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedApplications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleOpenEditCareer(app)}
                  className="bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-2xl p-4 transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {app.platform?.toUpperCase() || "DIRECT"}
                      </span>
                      <span className="text-[11px] font-bold capitalize text-slate-600 dark:text-slate-300 flex items-center gap-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                        <FaEdit className="text-[10px] opacity-0 group-hover:opacity-100 transition" />
                        {app.stage}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{app.role}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-1">{app.company}</p>
                    {app.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 italic">"{app.notes}"</p>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Applied: {app.application_date || "Recorded"}</span>
                    {app.interview_date && (
                      <span className="text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded-md">
                        Int: {app.interview_date}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              No career milestones recorded in this stage. Click "Log Milestone" to track job applications and interviews.
            </div>
          )}
        </div>

        {/* 4. CONNECTED PLATFORMS STATUS (CONCISE) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FaLayerGroup className="text-blue-600 dark:text-blue-400" />
                <span>Connected Platform Telemetry Synchronization</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-platform ingestion status across OAuth integrations, public profile telemetry, and manual trackers.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Telemetry Stream Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {platformsList.map((p) => (
              <div
                key={p.key}
                className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{p.description}</p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold flex items-center gap-1 ${
                      p.connected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.connected ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                    {p.connected ? (p.mode.includes("BUILT-IN") ? "Active" : "Connected") : "Manual Tracking"}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">{p.mode.split(" ")[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. SMART FILTERS & SEARCH TOOLBAR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 transition-colors duration-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                id="input-activity-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities by title, description, or platform..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-9 pr-8 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            {/* Date Range Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Time:</span>
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "7d", label: "Last 7 Days" },
                { key: "30d", label: "Last 30 Days" },
                { key: "custom", label: "Custom" },
              ].map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    setDatePreset(preset.key);
                    setPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
                    datePreset === preset.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-xs">
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-600 dark:text-slate-300">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPage(0);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-600 dark:text-slate-300">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPage(0);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Category Pills & Dropdowns */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "all", label: "All Categories", icon: FaLayerGroup },
                { key: "coding", label: "Coding", icon: FaCode },
                { key: "learning", label: "Learning", icon: FaBookOpen },
                { key: "problem_solving", label: "DSA & Solves", icon: FaBrain },
                { key: "productivity", label: "Focus & Tasks", icon: FaStopwatch },
                { key: "career", label: "Career", icon: FaBriefcase },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      setPage(0);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 dark:bg-blue-600 text-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200/60 dark:border-slate-700"
                    }`}
                  >
                    <Icon className="text-[10px]" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Platform & Source Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <label className="font-bold text-slate-400 uppercase tracking-wider">Platform:</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => {
                    setSelectedPlatform(e.target.value);
                    setPage(0);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Platforms</option>
                  <option value="github">GitHub</option>
                  <option value="leetcode">LeetCode</option>
                  <option value="pomodoro">Pomodoro</option>
                  <option value="tasks">Tasks</option>
                  <option value="geeksforgeeks">GeeksforGeeks</option>
                  <option value="freecodecamp">freeCodeCamp</option>
                  <option value="coursera">Coursera</option>
                  <option value="nptel">NPTEL</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="naukri">Naukri</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <label className="font-bold text-slate-400 uppercase tracking-wider">Source:</label>
                <select
                  value={selectedSource}
                  onChange={(e) => {
                    setSelectedSource(e.target.value);
                    setPage(0);
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sources</option>
                  <option value="automatic">Automatic Sync</option>
                  <option value="pomodoro">Pomodoro Timer</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>

              {/* Clear All Filters */}
              {(selectedCategory !== "all" ||
                selectedPlatform !== "all" ||
                selectedSource !== "all" ||
                searchQuery !== "" ||
                datePreset !== "all") && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              Showing <strong className="text-slate-900 dark:text-white">{activities.length}</strong> of{" "}
              <strong className="text-slate-900 dark:text-white">{totalCount}</strong> verified activities
            </span>
            {debouncedSearch && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">Filtering by search: "{debouncedSearch}"</span>
            )}
          </div>
        </div>

        {/* 6. UNIFIED ACTIVITY TIMELINE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
              <span>Unified Activity Timeline</span>
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <FaInfoCircle className="text-3xl text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No activity records match your filter criteria.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Try clearing active filters or synchronizing connected platforms.
              </p>
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-3 pl-2">Platform</th>
                    <th className="py-3">Category</th>
                    <th className="py-3">Activity & Details</th>
                    <th className="py-3">Duration</th>
                    <th className="py-3">Source</th>
                    <th className="py-3 pr-2 text-right">Date & Time</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activities.map((act) => {
                    const catStyle = CATEGORY_COLORS[act.category] || CATEGORY_COLORS.other;
                    const srcInfo = SOURCE_BADGES[act.source] || SOURCE_BADGES.automatic;

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-805 transition group">
                        <td className="py-3.5 pl-2 font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {act.platform}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${catStyle}`}
                          >
                            {act.category.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 max-w-md">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{act.title}</p>
                          {act.details && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">{act.details}</p>
                          )}
                        </td>
                        <td className="py-3.5 font-mono text-slate-800 dark:text-slate-200">
                          {act.duration_formatted}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${srcInfo.style}`}
                          >
                            {srcInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 pr-2 text-right text-slate-400 font-mono">
                          {act.activity_date} {act.time}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteActivity(act.id)}
                            title="Delete activity record"
                            className="text-slate-300 dark:text-slate-600 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1.5 cursor-pointer"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Page <strong className="text-slate-800 dark:text-white">{page + 1}</strong> of{" "}
                <strong className="text-slate-800 dark:text-white">{totalPages}</strong>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* 7. CAREER MILESTONE MODAL */}
        {showCareerModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 rounded-2xl">
                    <FaBriefcase className="text-base" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {editingApplicationId ? "Update Career Milestone" : "Log Career Milestone"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Track hiring stages, interview dates, and recruiter notes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCareerModal(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCareerSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Company *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google, Microsoft, Startup"
                      value={careerForm.company}
                      onChange={(e) => setCareerForm({ ...careerForm, company: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Role / Position *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Full Stack Engineer"
                      value={careerForm.role}
                      onChange={(e) => setCareerForm({ ...careerForm, role: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Pipeline Stage *
                    </label>
                    <select
                      value={careerForm.stage}
                      onChange={(e) => setCareerForm({ ...careerForm, stage: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="saved">Saved / Wishlist</option>
                      <option value="applied">Applied</option>
                      <option value="assessment">Assessment Done</option>
                      <option value="interview">Interview Scheduled</option>
                      <option value="offer">Offer Received</option>
                      <option value="rejected">Rejected / Withdrawn</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Source / Platform
                    </label>
                    <select
                      value={careerForm.platform}
                      onChange={(e) => setCareerForm({ ...careerForm, platform: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="linkedin">LinkedIn</option>
                      <option value="naukri">Naukri</option>
                      <option value="indeed">Indeed</option>
                      <option value="company_portal">Company Portal</option>
                      <option value="referral">Referral / Network</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Application Date
                    </label>
                    <input
                      type="date"
                      value={careerForm.applicationDate}
                      onChange={(e) => setCareerForm({ ...careerForm, applicationDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Interview Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={careerForm.interviewDate}
                      onChange={(e) => setCareerForm({ ...careerForm, interviewDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Notes & Next Steps
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Salary expectations, recruiter contact, interview questions, or follow-up notes..."
                    value={careerForm.notes}
                    onChange={(e) => setCareerForm({ ...careerForm, notes: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCareerModal(false)}
                    className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingCareer || !careerForm.company.trim() || !careerForm.role.trim()}
                    className="px-5 py-2.5 rounded-xl font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingCareer ? "Saving..." : editingApplicationId ? "Update Milestone" : "Save Milestone"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 8. GENERAL MANUAL ACTIVITY MODAL */}
        {showManualModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <FaPlus className="text-base" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Developer Activity</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Log off-platform learning, study, or coding milestones</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Platform / Provider
                    </label>
                    <select
                      value={manualForm.platform}
                      onChange={(e) => setManualForm({ ...manualForm, platform: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="coursera">Coursera</option>
                      <option value="nptel">NPTEL</option>
                      <option value="leetcode">LeetCode</option>
                      <option value="github">GitHub</option>
                      <option value="geeksforgeeks">GeeksforGeeks</option>
                      <option value="freecodecamp">freeCodeCamp</option>
                      <option value="reading">Technical Reading</option>
                      <option value="manual">Other / Offline Practice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={manualForm.category}
                      onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="coding">Coding & Development</option>
                      <option value="learning">Learning & Theory</option>
                      <option value="problem_solving">Problem Solving / DSA</option>
                      <option value="productivity">Productivity & Sprint</option>
                      <option value="career">Career / Applications</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Activity Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Completed Distributed Systems Module"
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      value={manualForm.durationMinutes}
                      onChange={(e) => setManualForm({ ...manualForm, durationMinutes: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Activity Date
                    </label>
                    <input
                      type="date"
                      value={manualForm.activityDate}
                      onChange={(e) => setManualForm({ ...manualForm, activityDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Description / Notes (Optional)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Key concepts reviewed, algorithms solved, or module highlights..."
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingManual || !manualForm.title.trim()}
                    className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingManual ? "Saving..." : "Save Activity"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
};

export default Activity;
