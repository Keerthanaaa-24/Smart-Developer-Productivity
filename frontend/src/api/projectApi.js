import API from "./axios";

export const getProjects = async (includeArchived = false) => {
  const response = await API.get(`/projects${includeArchived ? "?include_archived=true" : ""}`);
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await API.post("/projects", projectData);
  return response.data;
};

export const updateProject = async (projectId, projectData) => {
  const response = await API.put(`/projects/${projectId}`, projectData);
  return response.data;
};

export const deleteProject = async (projectId) => {
  const response = await API.delete(`/projects/${projectId}`);
  return response.data;
};
