import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// ATTACH JWT AUTOMATICALLY TO EVERY REQUEST
// =====================================================

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// =====================================================
// HANDLE AUTHENTICATION ERRORS
// =====================================================

API.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    if (error.response?.status === 401) {
      console.warn(
        "Authentication failed. JWT may be missing or expired."
      );
    }

    return Promise.reject(error);
  }
);


export default API;