import API from "./axios";

export const loginUser = async (userData, options = {}) => {
  const formData = new URLSearchParams();
  formData.append("username", (userData.username || "").trim());
  formData.append("password", userData.password || "");

  const response = await API.post("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 30000, // Bounded 30s timeout for cold start without endless freeze
    signal: options.signal,
    skipRetry: true, // Non-idempotent mutation must never be retried
  });

  return response.data;
};

export const registerUser = async (userData, options = {}) => {
  const payload = {
    username: (userData.username || "").trim(),
    email: (userData.email || "").trim().toLowerCase(),
    password: userData.password || "",
  };

  const response = await API.post("/auth/register", payload, {
    timeout: 25000,
    signal: options.signal,
    skipRetry: true,
  });
  return response.data;
};

export const getCurrentUser = async (options = {}) => {
  const response = await API.get("/auth/me", {
    timeout: 15000,
    signal: options.signal,
  });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await API.post(
    `/auth/change-password?current_password=${encodeURIComponent(currentPassword)}&new_password=${encodeURIComponent(newPassword)}`,
    null,
    { skipRetry: true }
  );
  return response.data;
};

/**
 * Proactively checks backend readiness endpoint to pre-warm sleeping Render container
 * and verify database connectivity.
 * Uses bounded timeout and skipRetry to prevent probe cascading.
 */
export const checkBackendHealth = async (retries = 1, delayMs = 1500, signal = null) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await API.get("/health/ready", {
        timeout: 6000,
        skipDeduplication: true,
        skipRetry: true,
        signal,
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