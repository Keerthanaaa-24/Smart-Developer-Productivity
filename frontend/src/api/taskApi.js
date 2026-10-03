import API from "./axios";

export const getTasks = async () => {
  const response = await API.get("/tasks/");
  return response.data;
};

export const getTaskById = async (taskId) => {
  if (!taskId) throw new Error("Task ID is required");
  const response = await API.get(`/tasks/${taskId}`);
  return response.data;
};

export const createTask = async (taskData) => {
  const response = await API.post("/tasks/", taskData);
  return response.data;
};

export const updateTask = async (taskId, taskData) => {
  if (!taskId) throw new Error("Task ID is required for update");
  const response = await API.put(`/tasks/${taskId}`, taskData);
  return response.data;
};

export const deleteTask = async (taskId) => {
  if (!taskId) throw new Error("Task ID is required for deletion");
  const response = await API.delete(`/tasks/${taskId}`);
  return response.data;
};
