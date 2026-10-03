import API from "./axios";

export const getGithubStatistics = async () => {
  const response = await API.get("/github/statistics");
  return response.data;
};

export const getGithubDailyContributions = async () => {
  const response = await API.get("/github/daily-contributions");
  return response.data;
};

export const getGithubLanguages = async () => {
  const response = await API.get("/github/languages");
  return response.data;
};

export const getGithubStreak = async () => {
  const response = await API.get("/github/streak");
  return response.data;
};

export const getGithubStatus = async () => {
  const response = await API.get("/github/status");
  return response.data;
};

export const getGithubProfile = async () => {
  const response = await API.get("/github/profile");
  return response.data;
};

export const getGithubRepositories = async () => {
  const response = await API.get("/github/repositories");
  return response.data;
};

export const getGithubActivity = async () => {
  const response = await API.get("/github/activity");
  return response.data;
};

// Backwards compatibility alias
export const getGithubStats = getGithubStatistics;