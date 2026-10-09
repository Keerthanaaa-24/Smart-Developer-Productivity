import API from "./axios";

export const getActivities = async ({
  limit = 20,
  offset = 0,
  category = null,
  platform = null,
  activityType = null,
  date = null,
  startDate = null,
  endDate = null,
  search = null,
} = {}) => {
  const params = { limit, offset };
  if (category && category !== "all") params.category = category;
  if (platform && platform !== "all") params.platform = platform;
  if (activityType && activityType !== "all") params.activity_type = activityType;
  if (date) params.date = date;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (search && search.trim()) params.search = search.trim();

  const response = await API.get("/activity", { params });
  return response.data;
};

export const getActivitySummary = async () => {
  const response = await API.get("/activity/summary");
  return response.data;
};

export const getTodayActivities = async () => {
  const response = await API.get("/activity/today");
  return response.data;
};

export const recordManualActivity = async ({
  platform,
  category,
  activityType = "manual_activity",
  title,
  description = null,
  durationMinutes = 0,
  activityDate = null,
}) => {
  const response = await API.post("/activity/manual", {
    platform,
    category,
    activity_type: activityType,
    title,
    description,
    duration_minutes: durationMinutes,
    activity_date: activityDate,
  });
  return response.data;
};

export const syncPlatformActivities = async () => {
  const response = await API.post("/activity/sync");
  return response.data;
};

export const getSyncStatus = async () => {
  const response = await API.get("/activity/sync-status");
  return response.data;
};

export const getCareerSummary = async () => {
  const response = await API.get("/activity/career/summary");
  return response.data;
};

export const getCareerApplications = async () => {
  const response = await API.get("/activity/career/applications");
  return response.data;
};

export const logCareerApplication = async ({
  company,
  role,
  stage = "applied",
  platform = "linkedin",
  applicationDate = null,
  interviewDate = null,
  notes = null,
}) => {
  const response = await API.post("/activity/career/application", {
    company,
    role,
    stage,
    platform,
    application_date: applicationDate,
    interview_date: interviewDate,
    notes,
  });
  return response.data;
};

export const updateCareerApplication = async (
  activityId,
  {
    company,
    role,
    stage = "applied",
    platform = "linkedin",
    applicationDate = null,
    interviewDate = null,
    notes = null,
  }
) => {
  const response = await API.put(`/activity/career/application/${activityId}`, {
    company,
    role,
    stage,
    platform,
    application_date: applicationDate,
    interview_date: interviewDate,
    notes,
  });
  return response.data;
};

export const deleteActivity = async (activityId) => {
  const response = await API.delete(`/activity/${activityId}`);
  return response.data;
};

export const syncSinglePlatformActivity = async (platformName) => {
  const response = await API.post(`/activity/sync/${platformName}`);
  return response.data;
};

export const getProviderRegistry = async () => {
  const response = await API.get("/activity/providers");
  return response.data;
};

export const getDataTrustCenter = async () => {
  const response = await API.get("/activity/trust-center");
  return response.data;
};

export const exportActivityData = async (format = "json") => {
  const response = await API.get(`/activity/export?format=${format}`, {
    responseType: format === "csv" ? "blob" : "json",
  });
  return response.data;
};