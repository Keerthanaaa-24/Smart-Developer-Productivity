import { createContext, useContext, useEffect, useState } from "react";
import { applyTheme, getStoredTheme } from "../utils/theme";
import { getAppearanceSettings, updateAppearanceSettings } from "../api/settingsApi";

export const ThemeContext = createContext({
  theme: "dark",
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => getStoredTheme());

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    // Initial sync with stored preference
    const initial = getStoredTheme();
    setThemeState(initial);
    applyTheme(initial);

    // Sync with backend user settings if available
    const syncBackend = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token");
        if (token) {
          const data = await getAppearanceSettings();
          if (data?.theme && data.theme !== initial) {
            setThemeState(data.theme);
            applyTheme(data.theme);
          }
        }
      } catch (e) {
        // Fallback to local storage theme
      }
    };
    syncBackend();

    const handleThemeChange = (e) => {
      if (e.detail?.theme) {
        setThemeState(e.detail.theme);
      }
    };
    window.addEventListener("themeChanged", handleThemeChange);
    return () => window.removeEventListener("themeChanged", handleThemeChange);
  }, []);

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      if (token) {
        await updateAppearanceSettings(newTheme);
      }
    } catch (e) {
      console.warn("Could not save theme preference to server:", e);
    }
  };

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;