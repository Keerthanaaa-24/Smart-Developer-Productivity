import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ProtectedRoute = ({ children, adminOnly = false, studentOnly = false }) => {
  const location = useLocation();
  const auth = useAuth();
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (!token || token === "null" || token === "undefined") {
    const target = adminOnly ? "/admin/login" : "/login";
    return <Navigate to={target} state={{ from: location }} replace />;
  }

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = (auth?.user?.role || storedUser?.role || "student").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  // 1. Admin-only route requested by a non-admin: redirect to student dashboard
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 2. Student route requested by an admin: redirect exclusively to admin console
  // Admin must NOT land on or participate in developer productivity dashboard
  if ((studentOnly || !adminOnly) && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;