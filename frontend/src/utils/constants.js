export const APP_NAME =
  "Smart Developer Productivity Dashboard";

export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ||
  import.meta.env?.VITE_API_URL ||
  "http://127.0.0.1:8001";

export const TASK_STATUS = [
  "Pending",
  "Completed",
];

export const TASK_PRIORITY = [
  "Low",
  "Medium",
  "High",
];

export const SIDEBAR_LINKS = [
  {
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    name: "Tasks",
    path: "/tasks",
  },
  {
    name: "Analytics",
    path: "/analytics",
  },
  {
    name: "Pomodoro",
    path: "/pomodoro",
  },
  {
    name: "GitHub",
    path: "/github",
  },
  {
    name: "Settings",
    path: "/settings",
  },
];