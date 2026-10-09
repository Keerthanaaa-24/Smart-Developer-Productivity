import api from "./axios";

export const timeTrackingApi = {
  // Get active website time metrics, platform breakdown, and target progress
  getSummary: async () => {
    const response = await api.get("/time-tracking/summary");
    return response.data;
  },

  // Get paginated session intervals with optional filtering
  getSessions: async (params = {}) => {
    const response = await api.get("/time-tracking/sessions", { params });
    return response.data;
  },

  // Get supported platform list & whitelisted domains
  getPlatforms: async () => {
    const response = await api.get("/time-tracking/platforms");
    return response.data;
  },

  // Get user's extension settings & opt-in status
  getSettings: async () => {
    const response = await api.get("/time-tracking/settings");
    return response.data;
  },

  // Update extension preferences (e.g., enable/disable, idle threshold)
  updateSettings: async (settings) => {
    const response = await api.post("/time-tracking/settings", settings);
    return response.data;
  },

  // Purge user's browser tracking history
  purgeHistory: async () => {
    const response = await api.delete("/time-tracking/history");
    return response.data;
  },

  // Manual session batch sync (for testing or extension communication)
  syncSessions: async (sessions) => {
    const response = await api.post("/time-tracking/sessions/sync", { sessions });
    return response.data;
  },
};

export default timeTrackingApi;
