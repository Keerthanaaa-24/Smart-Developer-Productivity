import API from "./axios";

export const getDashboardOverview = async () => {
  const response = await API.get("/dashboard/overview");
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await API.get("/dashboard/stats");
  return response.data;
};