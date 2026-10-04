import API from "./axios";

export const getNotifications = async ({ limit = 20, offset = 0, unread_only = false } = {}) => {
  const response = await API.get("/notifications", {
    params: { limit, offset, unread_only },
  });
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await API.get("/notifications/unread-count");
  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await API.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await API.put("/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await API.delete(`/notifications/${notificationId}`);
  return response.data;
};

export const clearAllNotifications = async (onlyRead = false) => {
  const response = await API.delete("/notifications", {
    params: { only_read: onlyRead },
  });
  return response.data;
};

export const triggerNotificationCheck = async () => {
  const response = await API.post("/notifications/check");
  return response.data;
};
