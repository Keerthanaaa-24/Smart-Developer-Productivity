import API from "./axios";

export const getLeaderboard = async (params = {}) => {
  const { period = "all_time", page = 1, limit = 20, search = "" } = params;
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
  const response = await API.get(
    `/leaderboard?period=${period}&page=${page}&limit=${limit}${searchParam}`
  );
  return response.data;
};

export const getMyLeaderboardPosition = async (period = "all_time") => {
  const response = await API.get(`/leaderboard/me?period=${period}`);
  return response.data;
};

export const getMyPointsSummary = async () => {
  const response = await API.get("/leaderboard/points/me");
  return response.data;
};

export const getPublicStudentProfile = async (userId) => {
  const response = await API.get(`/leaderboard/${userId}`);
  return response.data;
};

const leaderboardApi = {
  getLeaderboard,
  getMyLeaderboardPosition,
  getMyPointsSummary,
  getPublicStudentProfile,
};

export default leaderboardApi;
