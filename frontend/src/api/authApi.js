import API from "./axios";

export const loginUser =
  async (userData) => {

    const formData =
      new URLSearchParams();

    formData.append(
      "username",
      userData.username
    );

    formData.append(
      "password",
      userData.password
    );

    const response =
      await API.post(
        "/auth/login",
        formData,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

    return response.data;
  };

export const registerUser =
  async (userData) => {

    const response =
      await API.post(
        "/auth/register",
        userData
      );

    return response.data;
  };