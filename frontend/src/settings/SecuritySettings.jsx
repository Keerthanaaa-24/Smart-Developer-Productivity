import { useState } from "react";

const SecuritySettings = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Security
        </h2>

        <p className="text-gray-500 mt-1">
          Manage your account security.
        </p>
      </div>

      <div className="border rounded-xl p-5 space-y-5">
        <div>
          <h3 className="font-semibold text-gray-800">
            Change Password
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Update your account password.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>

          <input
            type={showPassword ? "text" : "password"}
            className="w-full border rounded-lg px-4 py-3"
            placeholder="Enter current password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>

          <input
            type={showPassword ? "text" : "password"}
            className="w-full border rounded-lg px-4 py-3"
            placeholder="Enter new password"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />

          Show password
        </label>

        <button
          onClick={() => alert("Password update will be connected to the backend next.")}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Update Password
        </button>
      </div>

      <div className="border rounded-xl p-5">
        <h3 className="font-semibold text-gray-800">
          Login Sessions
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          Manage devices currently logged into your account.
        </p>

        <button
          onClick={() => alert("Session management will be connected next.")}
          className="mt-4 border border-red-500 text-red-600 px-5 py-2 rounded-lg hover:bg-red-50"
        >
          Sign Out Other Devices
        </button>
      </div>
    </div>
  );
};

export default SecuritySettings;