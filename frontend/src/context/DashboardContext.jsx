import {
  createContext,
  useEffect,
  useState,
} from "react";

import {
  getDashboardStats,
} from "../api/dashboardApi";

export const DashboardContext =
  createContext();

const DashboardProvider = ({
  children,
}) => {

  const [stats, setStats] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const fetchDashboardStats =
    async () => {

      try {

        const data =
          await getDashboardStats();

        setStats(data);

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    fetchDashboardStats();

  }, []);

  return (

    <DashboardContext.Provider
      value={{
        stats,
        loading,
        fetchDashboardStats,
      }}
    >

      {children}

    </DashboardContext.Provider>
  );
};

export default DashboardProvider;