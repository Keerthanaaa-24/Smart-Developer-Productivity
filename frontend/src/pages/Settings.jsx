import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ProfileSettings from "../settings/ProfileSettings";
import SecuritySettings from "../settings/SecuritySettings";
import AppearanceSettings from "../settings/AppearanceSettings";
import NotificationsSettings from "../settings/NotificationsSettings";
import ProductivitySettings from "../settings/ProductivitySettings";
import ConnectedAccounts from "../settings/ConnectedAccounts";
import PrivacySettings from "../settings/PrivacySettings";
import {
  FaUser,
  FaLock,
  FaPalette,
  FaBell,
  FaStopwatch,
  FaLink,
  FaShieldAlt,
  FaCog,
} from "react-icons/fa";

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || (searchParams.get("github") ? "connected" : "profile");
  const [activeTab, setActiveTab] = useState(urlTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const githubParam = searchParams.get("github");
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (githubParam) {
      setActiveTab("connected");
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    {
      id: "profile",
      name: "Profile",
      icon: <FaUser className="text-sm" />,
      description: "Manage your name, username, and biography",
    },
    {
      id: "security",
      name: "Account & Security",
      icon: <FaLock className="text-sm" />,
      description: "Update password and secure login credentials",
    },
    {
      id: "appearance",
      name: "Appearance",
      icon: <FaPalette className="text-sm" />,
      description: "Light, dark, and system theme modes",
    },
    {
      id: "notifications",
      name: "Notifications",
      icon: <FaBell className="text-sm" />,
      description: "Pomodoro alerts, audio chimes, and coaching",
    },
    {
      id: "productivity",
      name: "Productivity & Focus",
      icon: <FaStopwatch className="text-sm" />,
      description: "Daily output targets and Pomodoro durations",
    },
    {
      id: "connected",
      name: "Connected Accounts",
      icon: <FaLink className="text-sm" />,
      description: "GitHub, LeetCode, FCC, GFG, NPTEL, Coursera",
    },
    {
      id: "privacy",
      name: "Privacy & Data",
      icon: <FaShieldAlt className="text-sm" />,
      description: "Data visibility, telemetry logs, and deletion",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              <FaCog />
              <span>Workspace Preferences</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Settings & Personalization
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Customize your developer profile, targets, connected platforms, and account security.
            </p>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="lg:hidden">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Settings Section
          </label>
          <select
            value={activeTab}
            onChange={(e) => handleTabChange(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl p-3 space-y-1 sticky top-24 transition-colors duration-200">
              <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Navigation
              </p>

              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium"
                    }`}
                  >
                    <span
                      className={`p-2 rounded-xl transition ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-none">{tab.name}</div>
                      <div
                        className={`text-[11px] truncate mt-1 ${
                          isActive ? "text-blue-100" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 w-full">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl overflow-hidden transition-colors duration-200">
              {activeTab === "profile" && <ProfileSettings />}
              {activeTab === "security" && <SecuritySettings />}
              {activeTab === "appearance" && <AppearanceSettings />}
              {activeTab === "notifications" && <NotificationsSettings />}
              {activeTab === "productivity" && <ProductivitySettings />}
              {activeTab === "connected" && <ConnectedAccounts />}
              {activeTab === "privacy" && <PrivacySettings />}
            </div>
          </main>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;