import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";

export function ProtectedRoute() {
  const { isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) return null;

  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
