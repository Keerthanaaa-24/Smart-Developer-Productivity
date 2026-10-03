import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (!token || token === "null" || token === "undefined") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;