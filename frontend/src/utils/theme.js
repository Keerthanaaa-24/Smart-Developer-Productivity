const THEME_STORAGE_KEY = "smart_dev_theme";

let mediaQueryListener = null;

export const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch {
    return "dark";
  }
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  const body = document.body;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn("Could not save theme to localStorage:", e);
  }

  // Remove existing media listener if switching away from system
  if (mediaQueryListener) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.removeEventListener?.("change", mediaQueryListener);
    mediaQueryListener = null;
  }

  const applyClass = (isDark) => {
    if (isDark) {
      root.classList.add("dark");
      if (body) body.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      if (body) body.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  };

  if (theme === "dark") {
    applyClass(true);
  } else if (theme === "light") {
    applyClass(false);
  } else if (theme === "system") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    applyClass(mq.matches);

    mediaQueryListener = (e) => {
      if (getStoredTheme() === "system") {
        applyClass(e.matches);
      }
    };
    mq.addEventListener?.("change", mediaQueryListener);
  }

  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme } }));
};

export const initTheme = () => {
  const saved = getStoredTheme();
  applyTheme(saved);
};
