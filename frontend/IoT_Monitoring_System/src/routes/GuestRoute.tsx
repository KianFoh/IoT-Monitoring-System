import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";

export function GuestRoute() {
  const { isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) return <LoadingScreen />;

  return !isLoggedIn ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
