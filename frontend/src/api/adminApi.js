import API from "./axios";

// 1. Student Management
export const getAdminStudents = async (params = {}) => {
  const {
    search = "",
    status_filter = "all",
    role_filter = "all",
    page = 1,
    limit = 15,
  } = params;
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
  const response = await API.get(
    `/admin/students?status_filter=${status_filter}&role_filter=${role_filter}&page=${page}&limit=${limit}${searchParam}`
  );
  return response.data;
};

export const getAdminStudentDetails = async (userId) => {
  const response = await API.get(`/admin/students/${userId}`);
  return response.data;
};

export const updateStudentStatus = async (userId, payload) => {
  const response = await API.patch(`/admin/students/${userId}/status`, payload);
  return response.data;
};

// 2. Leaderboard & Points Auditing
export const getAdminPointLedger = async (params = {}) => {
  const {
    user_id = "",
    source_type = "",
    category = "",
    search = "",
    page = 1,
    limit = 25,
  } = params;
  let query = `/admin/audit/points?page=${page}&limit=${limit}`;
  if (user_id) query += `&user_id=${user_id}`;
  if (source_type) query += `&source_type=${encodeURIComponent(source_type)}`;
  if (category) query += `&category=${encodeURIComponent(category)}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  const response = await API.get(query);
  return response.data;
};

export const getAdminDuplicatePoints = async () => {
  const response = await API.get("/admin/audit/duplicate-points");
  return response.data;
};

export const deletePointTransaction = async (txId, reason) => {
  const response = await API.delete(
    `/admin/audit/points/${txId}?reason=${encodeURIComponent(reason)}`
  );
  return response.data;
};

export const adjustStudentPoints = async (payload) => {
  const response = await API.post("/admin/audit/points/adjust", payload);
  return response.data;
};

export const getAdminStreakAudit = async (userId) => {
  const response = await API.get(`/admin/audit/streaks/${userId}`);
  return response.data;
};

export const correctStudentStreak = async (payload) => {
  const response = await API.post("/admin/audit/streaks/correct", payload);
  return response.data;
};

// 3. Achievement Verification
export const getAdminAchievements = async (params = {}) => {
  const {
    status_filter = "all",
    category = "",
    search = "",
    page = 1,
    limit = 15,
  } = params;
  let query = `/admin/achievements?status_filter=${status_filter}&page=${page}&limit=${limit}`;
  if (category) query += `&category=${encodeURIComponent(category)}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  const response = await API.get(query);
  return response.data;
};

export const getAdminAchievementDetails = async (achievementId) => {
  const response = await API.get(`/admin/achievements/${achievementId}`);
  return response.data;
};

export const verifyAchievement = async (achievementId, payload) => {
  const response = await API.patch(
    `/admin/achievements/${achievementId}/verify`,
    payload
  );
  return response.data;
};

// 4. Platform Health & Integrations
export const getAdminHealthOverview = async () => {
  const response = await API.get("/admin/health/overview");
  return response.data;
};

// 5. Platform Analytics
export const getAdminAnalyticsOverview = async () => {
  const response = await API.get("/admin/analytics/overview");
  return response.data;
};

// 6. Security & Audit Logs
export const getAdminAuditLogs = async (params = {}) => {
  const {
    action = "",
    target_type = "",
    admin_id = "",
    search = "",
    page = 1,
    limit = 25,
  } = params;
  let query = `/admin/audit-logs?page=${page}&limit=${limit}`;
  if (action) query += `&action=${encodeURIComponent(action)}`;
  if (target_type) query += `&target_type=${encodeURIComponent(target_type)}`;
  if (admin_id) query += `&admin_id=${admin_id}`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  const response = await API.get(query);
  return response.data;
};

const adminApi = {
  getAdminStudents,
  getAdminStudentDetails,
  updateStudentStatus,
  getAdminPointLedger,
  getAdminDuplicatePoints,
  deletePointTransaction,
  adjustStudentPoints,
  getAdminStreakAudit,
  correctStudentStreak,
  getAdminAchievements,
  getAdminAchievementDetails,
  verifyAchievement,
  getAdminHealthOverview,
  getAdminAnalyticsOverview,
  getAdminAuditLogs,
};

export default adminApi;
