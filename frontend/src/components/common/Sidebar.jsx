import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaTasks,
  FaChartBar,
  FaClock,
  FaGithub,
  FaCog,
} from "react-icons/fa";

const menuItems = [
  {
    icon: <FaHome />,
    title: "Dashboard",
    path: "/dashboard",
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
    icon: <FaGithub />,
    title: "GitHub",
    path: "/github",
  },
  {
    icon: <FaCog />,
    title: "Settings",
    path: "/settings",
  },
];

const Sidebar = () => {
  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen p-5">
      <h1 className="text-3xl font-bold mb-10 text-center">
        SDP 🚀
      </h1>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 p-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
