import API from "./axios";
import { API_BASE_URL } from "../utils/constants";

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

export const getCertificateUrl = (achievement) => {
  if (!achievement) return "";
  const url = achievement.certificate_url || "";
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const token =
    localStorage.getItem("token") || localStorage.getItem("access_token") || "";
  const authQuery =
    !achievement.is_public && token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE_URL}/achievements/${achievement.id}/certificate${authQuery}`;
};

const achievementApi = {
  getMyAchievements,
  createAchievement,
  getAchievement,
  updateAchievement,
  deleteAchievement,
  uploadCertificate,
  getCertificateUrl,
};

export default achievementApi;

