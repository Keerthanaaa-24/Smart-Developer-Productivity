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
  timeout: 25000, // 25s timeout for cold-start recovery
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// IN-FLIGHT REQUEST DEDUPLICATION (GET ONLY)
// =====================================================

const inFlightRequests = new Map();

const getRequestKey = (config) => {
  const method = (config.method || "get").toLowerCase();
  const url = config.url || "";
  const params = config.params ? JSON.stringify(config.params) : "";
  const token = localStorage.getItem("token") || localStorage.getItem("access_token") || "";
  return `${method}:${url}:${params}:${token}`;
};

// =====================================================
// ATTACH JWT AUTHORIZATION HEADER & DEDUPLICATE
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

    const method = (config.method || "get").toLowerCase();
    // In-flight deduplication for safe idempotent GET requests
    if (method === "get" && !config.skipDeduplication) {
      const key = getRequestKey(config);
      if (inFlightRequests.has(key)) {
        config.adapter = () => inFlightRequests.get(key);
      } else {
        const defaultAdapter = config.adapter || axios.defaults.adapter;
        config.adapter = async (cfg) => {
          const promise = defaultAdapter(cfg);
          inFlightRequests.set(key, promise);
          try {
            return await promise;
          } finally {
            inFlightRequests.delete(key);
          }
        };
      }
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
    // 0. Explicitly ignore client abort / cancellation
    if (axios.isCancel(error) || error.name === "CanceledError") {
      return Promise.reject(error);
    }

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
      const rawDetail = error.response?.data?.detail;
      error.friendlyMessage = isAuthRequest
        ? (typeof rawDetail === "string" ? rawDetail : "Invalid username or password. Please check your credentials.")
        : "Session expired. Please log in again.";
      error.message = error.friendlyMessage;
      return Promise.reject(error);
    }

    // 2. Genuine cold-start & timeout detection (never trigger on client cancellations or 4xx/500 application errors)
    const isTimeout =
      error.code === "ECONNABORTED" ||
      (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));
    const isNetworkError =
      !error.response &&
      (typeof error.message === "string" && (error.message.includes("Network Error") || error.code === "ERR_NETWORK"));
    const isColdStartStatus = [502, 503, 504].includes(error.response?.status);
    const isGenuineColdStart = isTimeout || isColdStartStatus || (isNetworkError && (typeof navigator === "undefined" || navigator.onLine !== false));

    if (isGenuineColdStart && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("backend-cold-start", {
          detail: { url, method, isTimeout, status: error.response?.status },
        })
      );
    }

    // Determine if safe for single cold-start retry
    // ONLY safe idempotent GET requests are retried automatically.
    // POST, PUT, DELETE, and auth/oauth mutations are NEVER blindly retried.
    const isSafeGet = method === "get";
    const isOAuthFlow =
      url.includes("/oauth") ||
      url.includes("/github/login") ||
      url.includes("/github/callback");

    if (isSafeGet && !isOAuthFlow && isGenuineColdStart && !config._retry) {
      config._retry = true;
      console.info(`[Render Cold-Start] Retrying safe GET request: ${url}`);
      // Wait 1.5s before retry
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return API(config);
    }

    // 3. User-Friendly Error Classification
    if (isTimeout) {
      error.friendlyMessage =
        "The server is taking longer than expected to respond (backend may be waking up from an idle state). Please try again in a moment.";
    } else if (isNetworkError) {
      error.friendlyMessage =
        "Unable to reach the backend service. It may be waking up or your network connection is offline.";
    } else if (isColdStartStatus) {
      error.friendlyMessage =
        "Backend service is waking up from idle state. Please wait a moment and try again.";
    } else if (error.response?.status === 403) {
      error.friendlyMessage = "You do not have permission to perform this action.";
    } else if (error.response?.status === 404) {
      error.friendlyMessage = "The requested resource was not found.";
    } else if (error.response?.status === 422) {
      error.friendlyMessage = "Invalid request format or missing required fields.";
    } else if (error.response?.status === 429) {
      error.friendlyMessage = "Rate limit reached. Please slow down and try again shortly.";
    } else if (error.response?.status === 500) {
      error.friendlyMessage = "An internal server error occurred. Please try again in a few moments.";
    } else if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === "string") {
        error.friendlyMessage = detail;
      } else if (Array.isArray(detail)) {
        error.friendlyMessage = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      } else {
        error.friendlyMessage = "Request failed. Please try again.";
      }
    } else {
      error.friendlyMessage = "Unable to complete request. Please check your connection.";
    }

    // Safeguard error.message so legacy callers that read error.message
    // never show raw technical timeouts like 'timeout of 25000ms exceeded'
    error.message = error.friendlyMessage;

    return Promise.reject(error);
  }
);

export default API;