import { useEffect, useRef, useState } from "react";
import {
  FaBell,
  FaChevronDown,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaCheck,
  FaSun,
  FaMoon,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { theme, isDark, toggleTheme } = useTheme();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "Welcome to Smart Developer Dashboard!",
      time: "Just now",
      read: false,
    },
  ]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("profile");

    navigate("/login", {
      replace: true,
    });
  };

  const markAllRead = () => {
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const [userProfile, setUserProfile] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const storedProfile = JSON.parse(localStorage.getItem("profile") || "null");
    return {
      name: storedProfile?.name || storedUser?.name || storedUser?.full_name || storedUser?.username || "Developer",
      image: storedProfile?.profile_image || storedUser?.profile_image || storedUser?.avatar_url || null,
    };
  });

  useEffect(() => {
    const handleProfileUpdated = () => {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      const storedProfile = JSON.parse(localStorage.getItem("profile") || "null");
      setUserProfile({
        name: storedProfile?.name || storedUser?.name || storedUser?.full_name || storedUser?.username || "Developer",
        image: storedProfile?.profile_image || storedUser?.profile_image || storedUser?.avatar_url || null,
      });
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdated);
    window.addEventListener("storage", handleProfileUpdated);
    return () => {
      window.removeEventListener("userProfileUpdated", handleProfileUpdated);
      window.removeEventListener("storage", handleProfileUpdated);
    };
  }, []);

  const profileName = userProfile.name;
  const profileImage = userProfile.image;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="h-20 px-5 sm:px-8 flex items-center justify-between">
        
        {/* BRAND / TITLE */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 truncate tracking-tight">
            Smart Developer Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track. Learn. Improve. Build.
          </p>
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* THEME SWITCH TOGGLE BUTTON */}
          <button
            id="btn-theme-toggle"
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            {isDark ? (
              <FaSun className="text-lg text-amber-400 hover:rotate-45 transition-transform duration-300" />
            ) : (
              <FaMoon className="text-lg text-indigo-600 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* NOTIFICATION BELL */}
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((previous) => !previous)}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
              aria-label="Notifications"
            >
              <FaBell className="text-lg" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION PANEL */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-[320px] max-w-[90vw] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-fadeIn">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Notifications
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {unreadCount} unread
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <FaBell className="mx-auto text-slate-300 dark:text-slate-600 text-2xl" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                        No notifications
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-5 py-3.5 transition ${
                          !notification.read
                            ? "bg-blue-50/60 dark:bg-blue-950/30"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            {notification.read ? <FaCheck className="text-xs" /> : <FaBell className="text-xs" />}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* USER PROFILE DROPDOWN */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((previous) => !previous)}
              className="flex items-center gap-2 sm:gap-3 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  <FaUser />
                </div>
              )}

              <div className="hidden sm:block text-left">
                <p className="font-bold text-xs text-slate-900 dark:text-white max-w-[120px] truncate">
                  {profileName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Developer
                </p>
              </div>

              <FaChevronDown className="hidden sm:block text-[10px] text-slate-400" />
            </button>

            {/* PROFILE MENU */}
            {showProfileMenu && (
              <div className="absolute right-0 top-14 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-fadeIn">
                <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {profileName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Developer Account
                  </p>
                </div>

                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/profile");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                  >
                    <FaUser className="text-slate-400" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/settings");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                  >
                    <FaCog className="text-slate-400" />
                    <span>Settings</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                  >
                    <FaSignOutAlt />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;