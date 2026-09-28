import { useState } from "react";

const PrivacySettings = () => {
  const [profilePublic, setProfilePublic] = useState(true);
  const [analyticsSharing, setAnalyticsSharing] = useState(true);
  const [activityVisibility, setActivityVisibility] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Privacy
        </h2>

        <p className="text-gray-500 mt-1">
          Control how your information is shared.
        </p>
      </div>

      <div className="space-y-4">
        <PrivacyOption
          title="Public Developer Profile"
          description="Allow other users to view your developer profile."
          value={profilePublic}
          onChange={setProfilePublic}
        />

        <PrivacyOption
          title="Productivity Analytics"
          description="Allow analytics to be used for personalized insights."
          value={analyticsSharing}
          onChange={setAnalyticsSharing}
        />

        <PrivacyOption
          title="Activity Visibility"
          description="Show your development activity on your dashboard."
          value={activityVisibility}
          onChange={setActivityVisibility}
        />
      </div>

      <div className="border border-red-200 bg-red-50 rounded-xl p-5">
        <h3 className="font-semibold text-red-700">
          Danger Zone
        </h3>

        <p className="text-sm text-red-600 mt-1">
          Account deletion will permanently remove your account and data.
        </p>

        <button
          onClick={() => alert("Account deletion will be implemented later.")}
          className="mt-4 border border-red-500 text-red-600 px-5 py-2 rounded-lg hover:bg-red-100"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

const PrivacyOption = ({
  title,
  description,
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 border rounded-xl p-5">
      <div>
        <h3 className="font-semibold text-gray-800">
          {title}
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          {description}
        </p>
      </div>

      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition ${
          value ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
            value ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
};

export default PrivacySettings;