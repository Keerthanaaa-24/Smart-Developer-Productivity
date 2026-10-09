import API from "./axios";

export const mlApi = {
  // Feature 1: Data Readiness & Audit
  getDatasetReadiness: async () => {
    const response = await API.get("/ml/readiness");
    return response.data;
  },

  // Feature 2: 7-Day Productivity Forecasting
  getProductivityForecast: async () => {
    const response = await API.get("/ml/productivity/forecast");
    return response.data;
  },

  // Feature 3: Career Readiness Assessment
  getCareerReadiness: async () => {
    const response = await API.get("/ml/career-readiness");
    return response.data;
  },

  // Feature 4: Skill Gap Analysis
  getSkillGapsOverview: async () => {
    const response = await API.get("/ml/skill-gaps");
    return response.data;
  },

  analyzeSkillGaps: async (payload) => {
    const response = await API.post("/ml/skill-gaps/analyze", payload);
    return response.data;
  },

  deleteSkillGapAnalysis: async (id) => {
    const response = await API.delete(`/ml/skill-gaps/${id}`);
    return response.data;
  },

  // Feature 5: Personalized Recommendations
  getRecommendations: async () => {
    const response = await API.get("/ml/recommendations");
    return response.data;
  },

  completeRecommendation: async (id) => {
    const response = await API.post(`/ml/recommendations/${id}/complete`);
    return response.data;
  },

  dismissRecommendation: async (id) => {
    const response = await API.post(`/ml/recommendations/${id}/dismiss`);
    return response.data;
  },

  // Daily Regression Score & Prediction History
  getMyProductivityPrediction: async () => {
    const response = await API.get("/ml/my-productivity");
    return response.data;
  },

  predictCustomProductivity: async (features) => {
    const response = await API.post("/ml/predict-productivity", features);
    return response.data;
  },

  getPredictionHistory: async (limit = 7) => {
    const response = await API.get(`/ml/history?limit=${limit}`);
    return response.data;
  },

  getModelStatus: async () => {
    const response = await API.get("/ml/model-status");
    return response.data;
  },

  getModelInfo: async () => {
    const response = await API.get("/ml/model-info");
    return response.data;
  },
};

// Also keep named exports for backwards compatibility
export const getMyProductivityPrediction = mlApi.getMyProductivityPrediction;
export const predictCustomProductivity = mlApi.predictCustomProductivity;
export const getPredictionHistory = mlApi.getPredictionHistory;
export const getModelInfo = mlApi.getModelInfo;
export const getProductivityForecast = mlApi.getProductivityForecast;
export const getCareerReadiness = mlApi.getCareerReadiness;
export const getRecommendations = mlApi.getRecommendations;

export default mlApi;
