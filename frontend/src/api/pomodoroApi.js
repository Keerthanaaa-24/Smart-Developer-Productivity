import API from "./axios";

export const startPomodoroSession = async ({
  taskId = null,
  sessionType = "focus",
  plannedDurationSeconds = 1500,
  cycleNumber = 1,
} = {}) => {
  const response = await API.post("/pomodoro/session/start", {
    task_id: taskId,
    session_type: sessionType,
    planned_duration_seconds: plannedDurationSeconds,
    cycle_number: cycleNumber,
  });
  return response.data;
};

export const pausePomodoroSession = async (sessionId, elapsedSeconds = 0) => {
  const response = await API.post(`/pomodoro/session/${sessionId}/pause`, {
    elapsed_seconds: elapsedSeconds,
  });
  return response.data;
};

export const resumePomodoroSession = async (sessionId) => {
  const response = await API.post(`/pomodoro/session/${sessionId}/resume`);
  return response.data;
};

export const completePomodoroSession = async (sessionId, actualDurationSeconds = 1500) => {
  const response = await API.post(`/pomodoro/session/${sessionId}/complete`, {
    actual_duration_seconds: actualDurationSeconds,
  });
  return response.data;
};

export const cancelPomodoroSession = async (sessionId, elapsedSeconds = 0) => {
  const response = await API.post(`/pomodoro/session/${sessionId}/cancel`, {
    elapsed_seconds: elapsedSeconds,
  });
  return response.data;
};

export const getActivePomodoroSession = async () => {
  const response = await API.get("/pomodoro/active");
  return response.data?.active_session || null;
};

export const getPomodoroStats = async () => {
  const response = await API.get("/pomodoro/stats");
  return response.data;
};

export const getPomodoroHistory = async ({ limit = 20, offset = 0, status = null } = {}) => {
  const params = { limit, offset };
  if (status) params.status = status;
  const response = await API.get("/pomodoro/history", { params });
  return response.data?.history || [];
};
