import API from "./axios";

export const careerImpactApi = {
  getCareerImpactReport: async () => {
    const res = await API.get("/career-impact/report");
    return res.data;
  },
};

export default careerImpactApi;
