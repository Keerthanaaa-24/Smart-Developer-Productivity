import { useState } from "react";
import ConnectedAccounts from "../settings/ConnectedAccounts";

const Settings = () => {
  const [activeSection, setActiveSection] =
    useState("Connected Accounts");

  const sections = [
    {
      name: "Connected Accounts",
      icon: "🔗",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <p className="text-sm font-semibold text-blue-600">
            Account
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-1">
            Settings
          </h1>

          <p className="text-gray-500 mt-2">
            Manage your connected developer and learning platforms.
          </p>

        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Mobile */}
        <div className="lg:hidden mb-5">

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Settings
          </label>

          <select
            value={activeSection}
            onChange={(e) =>
              setActiveSection(e.target.value)
            }
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sections.map((section) => (
              <option
                key={section.name}
                value={section.name}
              >
                {section.name}
              </option>
            ))}
          </select>

        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">

              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Settings
              </p>

              {sections.map((section) => {

                const active =
                  activeSection === section.name;

                return (
                  <button
                    key={section.name}
                    onClick={() =>
                      setActiveSection(section.name)
                    }
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-lg">
                      {section.icon}
                    </span>

                    <span className="text-sm font-medium">
                      {section.name}
                    </span>
                  </button>
                );
              })}

            </div>

          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {activeSection === "Connected Accounts" && (
                <ConnectedAccounts />
              )}

            </div>

          </main>

        </div>

      </div>

    </div>
  );
};

export default Settings;