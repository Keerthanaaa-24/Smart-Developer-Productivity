import API from "./axios";

export const portfolioApi = {
  getMyPortfolioSettings: async () => {
    const res = await API.get("/portfolio/me");
    return res.data;
  },

  updateMyPortfolioSettings: async (settingsData) => {
    const res = await API.put("/portfolio/me", settingsData);
    return res.data;
  },

  getPublicPortfolio: async (slug) => {
    const res = await API.get(`/portfolio/public/${slug}`);
    return res.data;
  },

  exportResumeData: async () => {
    const res = await API.get("/portfolio/export/resume");
    return res.data;
  },
};

export default portfolioApi;
