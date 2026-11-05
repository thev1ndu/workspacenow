import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthHooks } from "@workspacenow/auth";

export function Protected() {
  const { isAuthenticated } = useAuthHooks();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
