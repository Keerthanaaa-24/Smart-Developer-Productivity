import { useState } from "react";

import { useNavigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";

import { loginUser } from "../api/authApi";

const Login = () => {

  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [formData, setFormData] =
    useState({
      username: "",
      password: "",
    });

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = async (
    e
  ) => {

    e.preventDefault();

    try {

      const data =
        await loginUser(
          formData
        );

      localStorage.setItem(
        "token",
        data.access_token
      );

      alert(
        "Login Successful 🚀"
      );

      navigate("/dashboard");

    } catch (error) {

      console.log(error);

      alert("Login Failed");
    }
  };

  return (

    <AuthLayout>

      <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">

        Smart Developer Dashboard

      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        <input
          type="email"
          name="username"
          placeholder="Enter Email"
          className="w-full border p-4 rounded-lg"
          onChange={handleChange}
        />

        <div className="relative">

          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            name="password"
            placeholder="Enter Password"
            className="w-full border p-4 rounded-lg"
            onChange={handleChange}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
            className="absolute right-4 top-4"
          >

            {showPassword
              ? "🙈"
              : "👁️"}

          </button>

        </div>

        <button
          type="submit"
          className="w-full bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-lg font-semibold"
        >

          Login

        </button>

      </form>

    </AuthLayout>
  );
};

export default Login;