import api from "./axios";

export const getRecentActivity = async () => {
  const response = await api.get(
    "/developer-activity/recent"
  );

  return response.data;
};