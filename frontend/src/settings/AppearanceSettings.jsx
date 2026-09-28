import { useState } from "react";

const AppearanceSettings = () => {
  const [theme, setTheme] = useState("light");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Appearance
        </h2>

        <p className="text-gray-500 mt-1">
          Customize how your dashboard looks.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { id: "light", label: "Light" },
          { id: "dark", label: "Dark" },
          { id: "system", label: "System" },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={`p-5 rounded-xl border-2 text-left transition ${
              theme === option.id
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <h3 className="font-semibold text-gray-800">
              {option.label}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {option.id === "light" && "Use a bright interface."}
              {option.id === "dark" && "Use a dark interface."}
              {option.id === "system" && "Follow your system preference."}
            </p>
          </button>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-5">
        <p className="text-sm text-gray-600">
          Selected theme:{" "}
          <strong className="capitalize">{theme}</strong>
        </p>
      </div>
    </div>
  );
};

export default AppearanceSettings;