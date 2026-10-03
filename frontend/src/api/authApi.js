import API from "./axios";

export const loginUser = async (userData) => {
  const formData = new URLSearchParams();
  formData.append("username", (userData.username || "").trim());
  formData.append("password", userData.password || "");

  const response = await API.post("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
};

export const registerUser = async (userData) => {
  const payload = {
    username: (userData.username || "").trim(),
    email: (userData.email || "").trim().toLowerCase(),
    password: userData.password || "",
  };

  const response = await API.post("/auth/register", payload);
  return response.data;
};