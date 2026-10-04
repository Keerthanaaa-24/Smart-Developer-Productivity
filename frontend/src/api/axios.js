import axios from "axios";

// =====================================================
// API CONFIGURATION
// =====================================================

const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8001",
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// ATTACH JWT TO EVERY REQUEST
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

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =====================================================
// HANDLE RESPONSE ERRORS
// =====================================================

API.interceptors.response.use(
  (response) => response,

  (error) => {
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