import React, { useState, useEffect } from "react";
import {
  FaUserTie,
  FaGlobe,
  FaCopy,
  FaCheck,
  FaEye,
  FaPrint,
  FaLock,
  FaUnlock,
  FaGithub,
  FaLinkedin,
  FaTwitter,
  FaLink,
  FaSave,
  FaExternalLinkAlt,
  FaCode,
  FaGraduationCap,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import portfolioApi from "../api/portfolioApi";

const Portfolio = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [settings, setSettings] = useState({
    custom_slug: "",
    is_public_portfolio_enabled: true,
    headline: "Full-Stack Developer & Software Engineer",
    about_me: "",
    location: "Bengaluru, India",
    website_url: "",
    linkedin_url: "",
    github_url: "",
    twitter_url: "",
    contact_email_public: false,
    public_contact_note: "Feel free to connect via LinkedIn or GitHub!",
    show_github_stats: true,
    show_coding_stats: true,
    show_learning_milestones: true,
    show_career_readiness: true,
    show_skill_badges: true,
    show_featured_projects: true,
  });

  // Preview Data
  const [preview, setPreview] = useState(null);

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const data = await portfolioApi.getMyPortfolioSettings();
      if (data.settings) {
        setSettings({
          custom_slug: data.settings.custom_slug || "",
          is_public_portfolio_enabled: data.settings.is_public_portfolio_enabled ?? true,
          headline: data.settings.headline || "Full-Stack Developer & Software Engineer",
          about_me: data.settings.about_me || "",
          location: data.settings.location || "",
          website_url: data.settings.website_url || "",
          linkedin_url: data.settings.linkedin_url || "",
          github_url: data.settings.github_url || "",
          twitter_url: data.settings.twitter_url || "",
          contact_email_public: data.settings.contact_email_public || false,
          public_contact_note: data.settings.public_contact_note || "Feel free to connect via LinkedIn or GitHub!",
          show_github_stats: data.settings.show_github_stats ?? true,
          show_coding_stats: data.settings.show_coding_stats ?? true,
          show_learning_milestones: data.settings.show_learning_milestones ?? true,
          show_career_readiness: data.settings.show_career_readiness ?? true,
          show_skill_badges: data.settings.show_skill_badges ?? true,
          show_featured_projects: data.settings.show_featured_projects ?? true,
        });
      }
      if (data.preview) {
        setPreview(data.preview);
      }
    } catch (err) {
      console.error("Failed to load portfolio settings:", err);
      setToast({ type: "error", message: "Failed to load portfolio settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await portfolioApi.updateMyPortfolioSettings(settings);
      setToast({ type: "success", message: "Portfolio settings updated successfully!" });
      fetchPortfolioData();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to update portfolio.";
      setToast({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const getPublicUrl = () => {
    const origin = window.location.origin;
    return `${origin}/portfolio/${settings.custom_slug || "developer"}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setToast({ type: "success", message: "Public portfolio URL copied to clipboard!" });
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintPDF = () => {
    window.open(getPublicUrl(), "_blank");
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-[500px] bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="lg:col-span-7 h-[500px] bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* TOAST ALERT */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                : "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
              ×
            </button>
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md shadow-purple-500/20 shrink-0">
              <FaUserTie />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Recruiter-Ready Portfolio
                </h1>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                    settings.is_public_portfolio_enabled
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {settings.is_public_portfolio_enabled ? <FaUnlock className="text-[10px]" /> : <FaLock className="text-[10px]" />}
                  {settings.is_public_portfolio_enabled ? "Public" : "Private"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Customize your shareable public developer showcase, verified telemetry, and resume export.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyLink}
              disabled={!settings.is_public_portfolio_enabled}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                settings.is_public_portfolio_enabled
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed"
              }`}
            >
              {copied ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
              {copied ? "Copied!" : "Copy Link"}
            </button>

            <button
              onClick={handlePrintPDF}
              disabled={!settings.is_public_portfolio_enabled}
              className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FaEye /> Live Recruiter View
            </button>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FaSave /> {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* MAIN CONFIGURATION & PREVIEW GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: SETTINGS & CONTROLS (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            {/* PUBLIC VISIBILITY & SLUG */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FaGlobe className="text-purple-500" /> Public URL & Visibility
              </h3>

              {/* Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Public Portfolio Visibility
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Allow recruiters to view your verified showcase via link
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.is_public_portfolio_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, is_public_portfolio_enabled: e.target.checked })
                  }
                  className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                />
              </div>

              {/* Custom Slug */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Custom URL Slug
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
                  <span className="text-slate-400 font-mono select-none">/portfolio/</span>
                  <input
                    type="text"
                    value={settings.custom_slug}
                    onChange={(e) => setSettings({ ...settings, custom_slug: e.target.value })}
                    placeholder="your-unique-handle"
                    className="bg-transparent border-none outline-none font-bold text-slate-800 dark:text-slate-100 flex-1 ml-1"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  e.g., https://smart-developer-productivity.vercel.app/portfolio/{settings.custom_slug || "your-slug"}
                </span>
              </div>
            </div>

            {/* PROFILE HEADLINE & ABOUT */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FaUserTie className="text-indigo-500" /> Professional Bio & Links
              </h3>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={settings.headline}
                  onChange={(e) => setSettings({ ...settings, headline: e.target.value })}
                  placeholder="e.g. Senior Full-Stack Engineer | React & FastAPI"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  About Me / Summary
                </label>
                <textarea
                  rows={3}
                  value={settings.about_me}
                  onChange={(e) => setSettings({ ...settings, about_me: e.target.value })}
                  placeholder="Summarize your engineering background, specializations, and focus..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={settings.location}
                    onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                    placeholder="e.g. Bengaluru, India"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={settings.website_url}
                    onChange={(e) => setSettings({ ...settings, website_url: e.target.value })}
                    placeholder="https://yourportfolio.dev"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1 flex items-center gap-1">
                    <FaGithub /> GitHub Link
                  </label>
                  <input
                    type="text"
                    value={settings.github_url}
                    onChange={(e) => setSettings({ ...settings, github_url: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1 flex items-center gap-1">
                    <FaLinkedin /> LinkedIn Link
                  </label>
                  <input
                    type="text"
                    value={settings.linkedin_url}
                    onChange={(e) => setSettings({ ...settings, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium outline-none"
                  />
                </div>
              </div>
            </div>

            {/* GRANULAR PRIVACY CONTROLS */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <FaShieldAlt className="text-emerald-500" /> Granular Section Privacy
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { key: "show_featured_projects", label: "Show Featured Project Repositories" },
                  { key: "show_github_stats", label: "Show Verified GitHub Stats & Commits" },
                  { key: "show_coding_stats", label: "Show LeetCode & GeeksforGeeks Badges" },
                  { key: "show_learning_milestones", label: "Show Coursera / NPTEL Course Milestones" },
                  { key: "show_career_readiness", label: "Show 5-Pillar Career Readiness Score" },
                  { key: "show_skill_badges", label: "Show Verified Technical Skill Badges" },
                  { key: "contact_email_public", label: "Expose Contact Email on Public Page (Default Off)" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer border border-transparent hover:border-slate-200/50"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={settings[item.key]}
                      onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                      className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE RECRUITER PREVIEW (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Live Public Portfolio Preview
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">Updates as you edit</span>
              </div>

              {preview ? (
                <div className="space-y-6">
                  {/* HERO BANNER */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          Verified Candidate
                        </span>
                        <span className="text-xs text-indigo-300/80">• {settings.location || preview.location}</span>
                      </div>
                      <h2 className="text-2xl font-black tracking-tight">{preview.developer_name}</h2>
                      <p className="text-sm font-semibold text-indigo-200">{settings.headline}</p>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl pt-2">
                        {settings.about_me || preview.about_me}
                      </p>

                      {/* External links */}
                      <div className="flex flex-wrap items-center gap-3 pt-4 text-xs font-bold">
                        {settings.github_url && (
                          <a
                            href={settings.github_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition"
                          >
                            <FaGithub /> GitHub
                          </a>
                        )}
                        {settings.linkedin_url && (
                          <a
                            href={settings.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition"
                          >
                            <FaLinkedin /> LinkedIn
                          </a>
                        )}
                        {settings.website_url && (
                          <a
                            href={settings.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition"
                          >
                            <FaGlobe /> Portfolio
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CAREER READINESS & VERIFIED PILLARS */}
                  {settings.show_career_readiness && preview.career_readiness && (
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          5-Pillar Career Readiness
                        </span>
                        <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                          {preview.career_readiness.overall_score}% ({preview.career_readiness.evaluation_grade})
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${preview.career_readiness.overall_score}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* TELEMETRY METRICS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GITHUB */}
                    {settings.show_github_stats && preview.github_metrics && (
                      <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <FaGithub /> GitHub Verified
                          </span>
                          <span className="text-[10px] text-emerald-500 font-semibold">OAuth2 Verified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                            <span className="text-lg font-black text-slate-900 dark:text-white block">
                              {preview.github_metrics.public_repos}
                            </span>
                            <span className="text-[10px] text-slate-500">Public Repos</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                            <span className="text-lg font-black text-slate-900 dark:text-white block">
                              {preview.github_metrics.total_contributions}
                            </span>
                            <span className="text-[10px] text-slate-500">Contributions</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LEETCODE & GFG */}
                    {settings.show_coding_stats && preview.coding_metrics && (
                      <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <FaCode className="text-amber-500" /> Algorithmic Challenges
                          </span>
                          <span className="text-[10px] text-emerald-500 font-semibold">API Verified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                            <span className="text-lg font-black text-slate-900 dark:text-white block">
                              {preview.coding_metrics.leetcode?.total_solved || 0}
                            </span>
                            <span className="text-[10px] text-slate-500">LeetCode Solved</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                            <span className="text-lg font-black text-slate-900 dark:text-white block">
                              {preview.coding_metrics.geeksforgeeks?.problems_solved || 0}
                            </span>
                            <span className="text-[10px] text-slate-500">GFG Solved</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FEATURED PROJECTS */}
                  {settings.show_featured_projects && preview.featured_projects?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Featured Projects
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {preview.featured_projects.map((proj, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white">{proj.name}</h5>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                                {proj.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {proj.description}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {proj.tech_stack?.slice(0, 3).map((t, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* VERIFIED SKILLS */}
                  {settings.show_skill_badges && preview.skills?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Verified Technical Stack
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center gap-1"
                          >
                            <FaCheck className="text-[9px] text-emerald-500" /> {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">No preview available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Portfolio;
