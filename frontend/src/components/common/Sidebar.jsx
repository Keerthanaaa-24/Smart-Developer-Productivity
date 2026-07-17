import {
  FaHome,
  FaTasks,
  FaChartBar,
  FaClock,
  FaGithub,
  FaCog,
} from "react-icons/fa";

const Sidebar = () => {

  const menuItems = [
    {
      icon: <FaHome />,
      title: "Dashboard",
    },
    {
      icon: <FaTasks />,
      title: "Tasks",
    },
    {
      icon: <FaChartBar />,
      title: "Analytics",
    },
    {
      icon: <FaClock />,
      title: "Pomodoro",
    },
    {
      icon: <FaGithub />,
      title: "GitHub",
    },
    {
      icon: <FaCog />,
      title: "Settings",
    },
  ];

  return (

    <div className="bg-gray-900 text-white w-64 min-h-screen p-5">

      <h1 className="text-3xl font-bold mb-10 text-center">
        SDP 🚀
      </h1>

      <div className="space-y-4">

        {menuItems.map((item, index) => (

          <div
            key={index}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-blue-600 cursor-pointer transition"
          >

            <span className="text-lg">
              {item.icon}
            </span>

            <span className="font-medium">
              {item.title}
            </span>

          </div>

        ))}

      </div>

    </div>
  );
};

export default Sidebar;