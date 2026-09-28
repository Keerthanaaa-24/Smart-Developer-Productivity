import { useEffect, useRef, useState } from "react";
import {
  FaBell,
  FaChevronDown,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaCheck,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showProfileMenu, setShowProfileMenu] =
    useState(false);

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

  // =====================================================
  // CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
  // =====================================================

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

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");

    localStorage.removeItem("user");
    localStorage.removeItem("profile");

    navigate("/login", {
      replace: true,
    });
  };

  // =====================================================
  // MARK NOTIFICATIONS READ
  // =====================================================

  const markAllRead = () => {
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  // =====================================================
  // PROFILE DATA
  // =====================================================

  const storedUser =
    JSON.parse(
      localStorage.getItem("user") || "null"
    );

  const storedProfile =
    JSON.parse(
      localStorage.getItem("profile") || "null"
    );

  const profileName =
    storedProfile?.name ||
    storedUser?.name ||
    storedUser?.full_name ||
    "Developer";

  const profileImage =
    storedProfile?.profile_image ||
    storedUser?.profile_image ||
    storedUser?.avatar_url ||
    null;

  // =====================================================
  // UI
  // =====================================================

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">

      <div className="h-20 px-5 sm:px-8 flex items-center justify-between">

        {/* BRAND */}

        <div className="min-w-0">

          <h1 className="text-xl sm:text-2xl font-bold text-blue-600 truncate">
            Smart Developer Dashboard
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Track. Learn. Improve. Build.
          </p>

        </div>


        {/* RIGHT SIDE */}

        <div className="flex items-center gap-3 sm:gap-5">

          {/* =================================================
              NOTIFICATION
          ================================================= */}

          <div
            ref={notificationRef}
            className="relative"
          >

            <button
              type="button"
              onClick={() =>
                setShowNotifications(
                  (previous) => !previous
                )
              }
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
              aria-label="Notifications"
            >

              <FaBell className="text-lg" />

              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}

            </button>


            {/* NOTIFICATION PANEL */}

            {showNotifications && (

              <div className="absolute right-0 top-12 w-[320px] max-w-[90vw] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">

                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">

                  <div>
                    <h3 className="font-bold text-slate-900">
                      Notifications
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      {unreadCount} unread
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Mark all read
                    </button>
                  )}

                </div>


                <div className="max-h-80 overflow-y-auto">

                  {notifications.length === 0 ? (

                    <div className="py-10 text-center">

                      <FaBell className="mx-auto text-slate-300 text-2xl" />

                      <p className="text-sm text-slate-500 mt-3">
                        No notifications
                      </p>

                    </div>

                  ) : (

                    notifications.map(
                      (notification) => (

                        <div
                          key={notification.id}
                          className={`px-5 py-4 border-b border-slate-100 ${
                            !notification.read
                              ? "bg-blue-50/50"
                              : ""
                          }`}
                        >

                          <div className="flex gap-3">

                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                              {notification.read ? (
                                <FaCheck />
                              ) : (
                                <FaBell />
                              )}
                            </div>

                            <div>

                              <p className="text-sm font-medium text-slate-700">
                                {notification.message}
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                {notification.time}
                              </p>

                            </div>

                          </div>

                        </div>

                      )
                    )

                  )}

                </div>

              </div>

            )}

          </div>


          {/* =================================================
              PROFILE
          ================================================= */}

          <div
            ref={profileRef}
            className="relative"
          >

            <button
              type="button"
              onClick={() =>
                setShowProfileMenu(
                  (previous) => !previous
                )
              }
              className="flex items-center gap-2 sm:gap-3 rounded-xl p-1.5 hover:bg-slate-50 transition"
            >

              {/* PROFILE IMAGE OR DEFAULT ICON */}

              {profileImage ? (

                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                />

              ) : (

                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center">
                  <FaUser />
                </div>

              )}


              <div className="hidden sm:block text-left">

                <p className="font-bold text-sm text-slate-800 max-w-[120px] truncate">
                  {profileName}
                </p>

                <p className="text-xs text-slate-400">
                  Developer
                </p>

              </div>

              <FaChevronDown className="hidden sm:block text-xs text-slate-400" />

            </button>


            {/* PROFILE MENU */}

            {showProfileMenu && (

              <div className="absolute right-0 top-14 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">

                <div className="px-4 py-4 border-b border-slate-100">

                  <p className="font-bold text-slate-800 truncate">
                    {profileName}
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    Developer account
                  </p>

                </div>


                <div className="p-2">

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/profile");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    <FaUser />
                    My Profile
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/settings");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    <FaCog />
                    Settings
                  </button>

                </div>


                <div className="border-t border-slate-100 p-2">

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition"
                  >
                    <FaSignOutAlt />
                    Logout
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