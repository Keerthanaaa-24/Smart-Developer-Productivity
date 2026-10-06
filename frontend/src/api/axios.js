import axios from "axios";

// =====================================================
// API CONFIGURATION
// =====================================================

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV
      ? "http://127.0.0.1:8001"
      : "https://smart-developer-productivity.onrender.com"),
  timeout: 60000, // 60s timeout ensures resilience during cloud provider cold starts
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// ATTACH JWT AUTHORIZATION HEADER
// =====================================================

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");

    if (token && token !== "null" && token !== "undefined") {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================================
// HANDLE RESPONSE ERRORS & SAFE COLD-START RETRIES
// =====================================================

API.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const url = config.url || "";
    const method = (config.method || "get").toLowerCase();

    // 1. Session Expiration (401 Unauthorized on protected routes)
    if (error.response?.status === 401) {
      const isAuthRequest = url.includes("/auth/login") || url.includes("/auth/register");
      
      if (!isAuthRequest) {
        console.warn("401 Unauthorized on protected route - session expired.");
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("profile");
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register" &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/login?expired=1";
        }
      }
      error.friendlyMessage = "Session expired. Please log in again.";
      return Promise.reject(error);
    }

    // 2. Determine if safe for single cold-start retry
    // Only safe idempotent GET requests, never OAuth or Auth mutations
    const isSafeGet = method === "get";
    const isOAuthFlow = url.includes("/oauth") || url.includes("/github/login") || url.includes("/github/callback");
    const isServerErrorOrTimeout =
      !error.response ||
      error.code === "ECONNABORTED" ||
      error.message?.includes("timeout") ||
      error.message?.includes("Network Error") ||
      [502, 503, 504].includes(error.response?.status);

    if (isSafeGet && !isOAuthFlow && isServerErrorOrTimeout && !config._retry) {
      config._retry = true;
      console.info(`[Render Cold-Start] Retrying safe GET request: ${url}`);
      // Wait 1.5s before retry
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return API(config);
    }

    // 3. User-Friendly Error Classification
    if (isServerErrorOrTimeout) {
      error.friendlyMessage = "Backend service is waking up. Please retry in a moment.";
    } else if (error.response?.status === 403) {
      error.friendlyMessage = "You do not have permission to perform this action.";
    } else if (error.response?.status === 404) {
      error.friendlyMessage = "The requested resource was not found.";
    } else if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      error.friendlyMessage = typeof detail === "string" ? detail : "Request failed. Please try again.";
    } else {
      error.friendlyMessage = "Unable to reach server. Please check your connection.";
    }

    return Promise.reject(error);
  }
);

export default API;