import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaBolt,
  FaFolder,
  FaTasks,
  FaChartBar,
  FaClock,
  FaCog,
  FaRocket,
  FaTimes,
  FaUserTie,
  FaChartLine,
} from "react-icons/fa";

const menuItems = [
  {
    icon: <FaHome />,
    title: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: <FaBolt />,
    title: "Activity",
    path: "/activity",
  },
  {
    icon: <FaFolder />,
    title: "Projects",
    path: "/projects",
  },
  {
    icon: <FaTasks />,
    title: "Tasks",
    path: "/tasks",
  },
  {
    icon: <FaChartBar />,
    title: "Analytics",
    path: "/analytics",
  },
  {
    icon: <FaClock />,
    title: "Pomodoro",
    path: "/pomodoro",
  },
  {
    icon: <FaUserTie />,
    title: "Portfolio",
    path: "/portfolio",
  },
  {
    icon: <FaChartLine />,
    title: "Career Impact",
    path: "/career-impact",
  },
  {
    icon: <FaCog />,
    title: "Settings",
    path: "/settings",
  },
];

const SidebarContent = ({ onItemClick, isMobile = false }) => (
  <div className="flex flex-col justify-between h-full">
    <div>
      <div className="mb-8 px-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-md shadow-blue-500/20 shrink-0">
            <FaRocket />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              Smart Dev
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 mt-1">
              Productivity
            </p>
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onItemClick}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close navigation"
          >
            <FaTimes className="text-lg" />
          </button>
        )}
      </div>

      <nav className="space-y-1.5" aria-label="Main Navigation">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
              }`
            }
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>

    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center mt-6">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        Smart Developer v2.4
      </p>
    </div>
  </div>
);

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  return (
    <>
      {/* Desktop Sidebar (hidden on screens < lg) */}
      <aside className="hidden lg:flex flex-col bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 w-64 min-h-screen p-5 shrink-0 transition-colors duration-200">
        <SidebarContent />
      </aside>

      {/* Mobile / Tablet Off-Canvas Drawer (screens < lg) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <aside className="relative z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 h-full p-5 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out">
            <SidebarContent onItemClick={onClose} isMobile={true} />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
