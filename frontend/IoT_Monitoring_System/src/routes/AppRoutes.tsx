import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import LoginPage from "@/features/auth/pages/login/LoginPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import ResendVerificationPage from "@/features/auth/pages/resend_verification/ResendVerificationPage";
import ResetPasswordPage from "@/features/auth/pages/send_reset_password/ResetPasswordPage";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";

export default function AppRoutes() {
  const { isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) return <LoadingScreen />;

  const defaultRoute = isLoggedIn ? "/dashboard" : "/login";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={isLoggedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/send-reset-password" element={<ResetPasswordPage />} />
      <Route path="/resend-verification" element={<ResendVerificationPage />} />
      <Route path="/verify-email" element={<div>Verify Email Page (to be implemented)</div>} />
      <Route path="/reset-password" element={<div>Reset Password Page (to be implemented)</div>} />
    </Routes>
  );
}
