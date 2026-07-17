import { useState } from "react";

import {
  FaMoon,
  FaSun,
} from "react-icons/fa";

const ThemeToggle = () => {

  const [darkMode, setDarkMode] =
    useState(false);

  const toggleTheme = () => {

    setDarkMode(!darkMode);

    document.documentElement.classList.toggle(
      "dark"
    );
  };

  return (

    <button
      onClick={toggleTheme}
      className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition"
    >

      {darkMode ? (
        <FaSun />
      ) : (
        <FaMoon />
      )}

    </button>
  );
};

export default ThemeToggle;