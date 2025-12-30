import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import LoginPage from "@/features/auth/pages/login/LoginPage";
import DashboardPage from "@/features/dashboard/DashboardPage";

export default function AppRoutes() {
  const { isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) return <div>Loading...</div>;

  const defaultRoute = isLoggedIn ? "/dashboard" : "/login";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={isLoggedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/reset-password" element={<div>Reset Password Page (to be implemented)</div>} />
      <Route path="/verify-email" element={<div>Verify Email Page (to be implemented)</div>} />
    </Routes>
  );
}
