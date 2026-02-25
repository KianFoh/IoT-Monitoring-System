import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@/types/user";
import { useAuth } from "@/features/auth/context/AuthContext";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";

interface RoleRouteProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function RoleRoute({ allowedRoles, redirectTo = "/dashboard" }: RoleRouteProps) {
  const { user, isAuthChecked } = useAuth();

  if (!isAuthChecked) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to={redirectTo} replace />;
}
