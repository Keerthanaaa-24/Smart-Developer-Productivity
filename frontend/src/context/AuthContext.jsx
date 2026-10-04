import { createContext, useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "../api/authApi";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("access_token");
      const cached = localStorage.getItem("user");
      if (token && cached) {
        return { ...JSON.parse(cached), token };
      }
    } catch {
      // ignore JSON parse error
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  const initAuth = useCallback(async () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");

    if (!token || token === "null" || token === "undefined") {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Verify token authenticity in the background without blocking the UI
      const userData = await getCurrentUser();
      if (userData && userData.id) {
        const fullUser = { ...userData, token };
        setUser(fullUser);
        localStorage.setItem("user", JSON.stringify(userData));
      }
    } catch (err) {
      console.warn("Session verification warning (clearing stale token):", err?.response?.status || err);
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("profile");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = (token, userData = null) => {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("access_token", token);
    }

    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser({ ...userData, token });
    } else {
      setUser({ token });
      getCurrentUser()
        .then((freshUser) => {
          if (freshUser) {
            localStorage.setItem("user", JSON.stringify(freshUser));
            setUser({ ...freshUser, token });
          }
        })
        .catch(() => {});
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        loading,
        refreshUser: initAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;