import API from "./axios";

export const getGithubStats =
  async () => {

    const response =
      await API.get(
        "/github/stats"
      );

    return response.data;
  };