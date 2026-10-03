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
      console.warn("401 Unauthorized - JWT missing or invalid.");

      // Do NOT automatically remove the token yet.
      // We want to debug the authentication flow first.
    }

    return Promise.reject(error);
  }
);

export default API;