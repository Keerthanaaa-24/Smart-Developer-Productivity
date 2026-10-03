import API from "./axios";

export const getAllSettings = async () => {
  const response = await API.get("/settings/all");
  return response.data;
};

export const getProfileSettings = async () => {
  const response = await API.get("/settings/profile");
  return response.data;
};

export const updateProfileSettings = async (payload) => {
  const response = await API.put("/settings/profile", payload);
  return response.data;
};

export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const response = await API.post("/settings/password", {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
};

export const getAppearanceSettings = async () => {
  const response = await API.get("/settings/appearance");
  return response.data;
};

export const updateAppearanceSettings = async (theme) => {
  const response = await API.put("/settings/appearance", { theme });
  return response.data;
};

export const getNotificationSettings = async () => {
  const response = await API.get("/settings/notifications");
  return response.data;
};

export const updateNotificationSettings = async (payload) => {
  const response = await API.put("/settings/notifications", payload);
  return response.data;
};

export const getProductivitySettings = async () => {
  const response = await API.get("/settings/productivity");
  return response.data;
};

export const updateProductivitySettings = async (payload) => {
  const response = await API.put("/settings/productivity", payload);
  return response.data;
};

export const getPrivacySettings = async () => {
  const response = await API.get("/settings/privacy");
  return response.data;
};

export const updatePrivacySettings = async (payload) => {
  const response = await API.put("/settings/privacy", payload);
  return response.data;
};

export const deleteUserAccount = async (confirmationText) => {
  const response = await API.delete("/settings/account", {
    data: { confirmation_text: confirmationText },
  });
  return response.data;
};
