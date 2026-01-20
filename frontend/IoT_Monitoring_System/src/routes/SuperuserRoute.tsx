import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function SuperuserRoute() {
  const { user, isAuthChecked } = useAuth();

  if (!isAuthChecked) return null;
  if (!user) return <Navigate to="/login" replace />;

  return user.role === "superuser" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
