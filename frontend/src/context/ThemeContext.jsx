import {
  createContext,
  useEffect,
  useState,
} from "react";

export const ThemeContext =
  createContext();

const ThemeProvider = ({
  children,
}) => {

  const [darkMode, setDarkMode] =
    useState(false);

  useEffect(() => {

    if (darkMode) {

      document.documentElement.classList.add(
        "dark"
      );

    } else {

      document.documentElement.classList.remove(
        "dark"
      );
    }

  }, [darkMode]);

  const toggleTheme = () => {

    setDarkMode(!darkMode);
  };

  return (

    <ThemeContext.Provider
      value={{
        darkMode,
        toggleTheme,
      }}
    >

      {children}

    </ThemeContext.Provider>
  );
};

export default ThemeProvider;