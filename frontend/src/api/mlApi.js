import API from "./axios";

export const getMyProductivityPrediction = async () => {
  const response = await API.get("/ml/my-productivity");
  return response.data;
};

export const predictCustomProductivity = async (features) => {
  const response = await API.post("/ml/predict-productivity", features);
  return response.data;
};

export const getPredictionHistory = async (limit = 7) => {
  const response = await API.get(`/ml/history?limit=${limit}`);
  return response.data;
};

export const getModelInfo = async () => {
  const response = await API.get("/ml/model-info");
  return response.data;
};

export const retrainProductivityModel = async () => {
  const response = await API.post("/ml/retrain");
  return response.data;
};
