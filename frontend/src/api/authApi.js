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
 * Proactively checks backend readiness endpoint to pre-warm sleeping Render container
 * and verify database connectivity.
 * Uses bounded retries on the safe idempotent GET /health/ready endpoint.
 */
export const checkBackendHealth = async (retries = 2, delayMs = 1500) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await API.get("/health/ready", {
        timeout: 9000,
        skipDeduplication: true,
      });
      if (response.data?.database === "connected" || response.status === 200) {
        return { ok: true, data: response.data, attempt };
      }
    } catch (err) {
      if (attempt === retries) {
        return {
          ok: false,
          error: err,
          attempt,
          isDbCold: err.response?.status === 503 || err.response?.data?.database === "disconnected",
        };
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return { ok: false };
};