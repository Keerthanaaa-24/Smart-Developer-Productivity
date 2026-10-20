import API from "./axios";

export const getMyAchievements = async (category = "") => {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const response = await API.get(`/achievements/me${query}`);
  return response.data;
};

export const createAchievement = async (data) => {
  const response = await API.post("/achievements", data);
  return response.data;
};

export const getAchievement = async (id) => {
  const response = await API.get(`/achievements/${id}`);
  return response.data;
};

export const updateAchievement = async (id, data) => {
  const response = await API.patch(`/achievements/${id}`, data);
  return response.data;
};

export const deleteAchievement = async (id) => {
  const response = await API.delete(`/achievements/${id}`);
  return response.data;
};

export const uploadCertificate = async (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await API.post(`/achievements/${id}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

const achievementApi = {
  getMyAchievements,
  createAchievement,
  getAchievement,
  updateAchievement,
  deleteAchievement,
  uploadCertificate,
};

export default achievementApi;
