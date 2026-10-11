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

export const getCurrentUser = async () => {
  const response = await API.get("/auth/me");
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await API.post(
    `/auth/change-password?current_password=${encodeURIComponent(currentPassword)}&new_password=${encodeURIComponent(newPassword)}`
  );
  return response.data;
};

/**
 * Proactively checks backend health endpoint to pre-warm sleeping Render container.
 * Uses bounded retries on the safe idempotent GET /health endpoint.
 */
export const checkBackendHealth = async (retries = 2, delayMs = 1500) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await API.get("/health", {
        timeout: 10000,
        skipDeduplication: true,
      });
      return { ok: true, data: response.data, attempt };
    } catch (err) {
      if (attempt === retries) {
        return { ok: false, error: err, attempt };
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return { ok: false };
};