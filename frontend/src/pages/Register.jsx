import { useState } from "react";

import { useNavigate } from "react-router-dom";

import AuthLayout from "../layouts/AuthLayout";

import { registerUser } from "../api/authApi";

const Register = () => {

  const navigate = useNavigate();

  const [formData, setFormData] =
    useState({
      username: "",
      email: "",
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

      await registerUser(
        formData
      );

      alert(
        "Registration Successful"
      );

      navigate("/login");

    } catch (error) {

      console.log(error);

      alert(
        "Registration Failed"
      );
    }
  };

  return (

    <AuthLayout>

      <h1 className="text-3xl font-bold text-center mb-8">
        Register
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        <input
          type="text"
          name="username"
          placeholder="Enter Username"
          className="w-full border p-3 rounded-lg"
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          className="w-full border p-3 rounded-lg"
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          className="w-full border p-3 rounded-lg"
          onChange={handleChange}
        />

        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg"
        >
          Register
        </button>

      </form>

    </AuthLayout>
  );
};

export default Register;