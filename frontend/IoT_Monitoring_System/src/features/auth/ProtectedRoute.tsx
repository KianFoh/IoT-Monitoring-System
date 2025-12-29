import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";

type Props = {
  children: ReactNode;
};

function ProtectedRoute({ children }: Props) {
  const location = useLocation();
  const { isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) return <div>Loading...</div>;

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;