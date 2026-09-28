import { useEffect, useRef, useState } from "react";
import {
  FaCamera,
  FaUser,
  FaLock,
  FaSave,
  FaSignOutAlt,
  FaCheckCircle,
  FaShieldAlt,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import API from "../api/axios";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Developer");
  const [profileImage, setProfileImage] = useState(null);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [message, setMessage] = useState("");

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  useEffect(() => {
    const storedUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const storedProfile = JSON.parse(
      localStorage.getItem("profile") || "null"
    );

    setName(
      storedProfile?.name ||
        storedUser?.name ||
        storedUser?.full_name ||
        "Developer"
    );

    setRole(
      storedProfile?.role ||
        "Developer"
    );

    setProfileImage(
      storedProfile?.profile_image ||
        storedUser?.profile_image ||
        null
    );
  }, []);

  // =====================================================
  // PROFILE IMAGE
  // =====================================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Profile image must be below 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfileImage(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const removeProfileImage = () => {
    setProfileImage(null);
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const saveProfile = async () => {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    try {
      setSavingProfile(true);
      setMessage("");

      /*
       * Keep the profile locally for now.
       * This also makes Navbar immediately use
       * the updated name/image.
       */

      const existingUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const updatedUser = {
        ...existingUser,
        name: name.trim(),
        full_name: name.trim(),
        profile_image: profileImage,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      localStorage.setItem(
        "profile",
        JSON.stringify({
          name: name.trim(),
          role,
          profile_image: profileImage,
        })
      );

      window.dispatchEvent(
        new Event("profileUpdated")
      );

      setMessage(
        "Profile updated successfully."
      );

    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      setMessage(
        "Unable to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const changePassword = async (event) => {
    event.preventDefault();

    if (!currentPassword) {
      alert("Enter your current password.");
      return;
    }

    if (!newPassword) {
      alert("Enter your new password.");
      return;
    }

    if (newPassword.length < 6) {
      alert(
        "New password must contain at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      alert(
        "New password and confirmation do not match."
      );
      return;
    }

    try {
      setChangingPassword(true);

      /*
       * This endpoint must exist in the backend:
       *
       * POST /auth/change-password
       *
       * If your backend uses a different endpoint,
       * we will connect it in the next backend step.
       */

      await API.post(
        "/auth/change-password",
        {
          current_password:
            currentPassword,

          new_password:
            newPassword,
        }
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      alert(
        "Password changed successfully."
      );

    } catch (error) {
      console.error(
        "Password change error:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    navigate("/login", {
      replace: true,
    });
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <MainLayout>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}

        <div>

          <p className="text-sm font-semibold text-blue-600">
            Account
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">
            My Profile
          </h1>

          <p className="text-slate-500 mt-2">
            Manage your personal information and account security.
          </p>

        </div>


        {/* PROFILE CARD */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <div className="px-6 sm:px-8 pb-8">

            <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-14">

              {/* PROFILE IMAGE */}

              <div className="relative w-28 h-28">

                {profileImage ? (

                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg"
                  />

                ) : (

                  <div className="w-28 h-28 rounded-2xl bg-slate-100 border-4 border-white shadow-lg flex items-center justify-center text-4xl text-slate-400">
                    <FaUser />
                  </div>

                )}

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="absolute -right-2 -bottom-2 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700"
                  title="Change profile picture"
                >
                  <FaCamera />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

              </div>


              {/* NAME */}

              <div className="flex-1">

                <h2 className="text-2xl font-bold text-slate-900">
                  {name || "Developer"}
                </h2>

                <p className="text-slate-500 mt-1">
                  {role}
                </p>

              </div>

            </div>


            {/* REMOVE IMAGE */}

            {profileImage && (

              <button
                type="button"
                onClick={removeProfileImage}
                className="text-sm text-red-500 hover:text-red-600 mt-4"
              >
                Remove profile picture
              </button>

            )}


            {/* FORM */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">

              <div>

                <label className="text-sm font-semibold text-slate-700">
                  Display Name
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your name"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-semibold text-slate-700">
                  Role
                </label>

                <input
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value
                    )
                  }
                  placeholder="Developer"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

            </div>


            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6">

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                <FaSave />

                {savingProfile
                  ? "Saving..."
                  : "Save Profile"}
              </button>


              {message && (

                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <FaCheckCircle />
                  {message}
                </div>

              )}

            </div>

          </div>

        </div>


        {/* SECURITY */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">

          <div className="flex items-center gap-3 mb-6">

            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FaShieldAlt />
            </div>

            <div>

              <h2 className="text-xl font-bold text-slate-900">
                Account Security
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Keep your account protected.
              </p>

            </div>

          </div>


          <form
            onSubmit={changePassword}
            className="space-y-5"
          >

            <div>

              <label className="text-sm font-semibold text-slate-700">
                Current Password
              </label>

              <input
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value
                  )
                }
                placeholder="Enter current password"
                className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>

                <label className="text-sm font-semibold text-slate-700">
                  New Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-semibold text-slate-700">
                  Confirm New Password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Repeat new password"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

            </div>


            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              <FaLock />

              {changingPassword
                ? "Changing..."
                : "Change Password"}
            </button>

          </form>

        </div>


        {/* LOGOUT */}

        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>

            <h2 className="font-bold text-red-700">
              Sign out
            </h2>

            <p className="text-sm text-red-600/70 mt-1">
              Sign out of this account on this device.
            </p>

          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
          >
            <FaSignOutAlt />
            Logout
          </button>

        </div>

      </div>

    </MainLayout>
  );
};

export default Profile;