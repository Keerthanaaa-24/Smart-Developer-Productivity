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
  timeout: 25000, // 25s timeout prevents infinite hanging during cold starts or network latency
  headers: {
    "Content-Type": "application/json",
  },
});

// Map to track and deduplicate identical in-flight GET requests
const inFlightRequests = new Map();

// Helper to build unique key for in-flight GET requests
const getRequestKey = (config) => {
  const method = (config.method || "get").toLowerCase();
  if (method !== "get") return null;
  const url = config.url || "";
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${url}?${params}`;
};

// =====================================================
// ATTACH JWT & IN-FLIGHT DEDUPLICATION
// =====================================================

API.interceptors.request.use(
  (config) => {
    // Check both possible token names
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token");

    if (token && token !== "null" && token !== "undefined") {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Deduplicate in-flight GET requests if requested
    const key = getRequestKey(config);
    if (key && inFlightRequests.has(key)) {
      config.cancelToken = new axios.CancelToken((cancel) => {
        inFlightRequests.get(key).then(
          (res) => cancel({ __isDeduplicated: true, data: res }),
          (err) => cancel({ __isDeduplicated: true, error: err })
        );
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================================
// HANDLE RESPONSE ERRORS & CLEANUP
// =====================================================

API.interceptors.response.use(
  (response) => {
    const key = getRequestKey(response.config);
    if (key) {
      inFlightRequests.delete(key);
    }
    return response;
  },

  (error) => {
    if (axios.isCancel(error) && error.message?.__isDeduplicated) {
      if (error.message.error) {
        return Promise.reject(error.message.error);
      }
      return Promise.resolve(error.message.data);
    }

    if (error.config) {
      const key = getRequestKey(error.config);
      if (key) {
        inFlightRequests.delete(key);
      }
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const isAuthRequest = url.includes("/auth/login") || url.includes("/auth/register");
      
      if (!isAuthRequest) {
        console.warn("401 Unauthorized on protected route - session expired.");
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("profile");
        // Dispatch session expired event if in browser
        if (typeof window !== "undefined" && window.location.pathname !== "/login" && window.location.pathname !== "/register" && window.location.pathname !== "/") {
          window.location.href = "/login?expired=1";
        }
      }
    }

    return Promise.reject(error);
  }
);


export default API;