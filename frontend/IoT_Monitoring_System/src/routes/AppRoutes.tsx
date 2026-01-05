import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";
import DashboardPage from "@/features/dashboard/DashboardPage";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import { LoginPage, EmailVerificationPage, ResendVerificationPage, ResetPasswordPage, ResetPasswordConfirmPage } from "@/features/auth";


export default function AppRoutes() {
  const { isLoggedIn, isAuthChecked } = useAuth();

  if (!isAuthChecked) return <LoadingScreen />;

  const defaultRoute = isLoggedIn ? "/dashboard" : "/login";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={isLoggedIn ? <DashboardPage /> : <Navigate to="/login" replace />} />
      <Route path="/send-reset-password" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />} />
      <Route path="/resend-verification" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <ResendVerificationPage />} />
      <Route path="/verify-email" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <EmailVerificationPage />} />
      <Route path="/reset-password" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <ResetPasswordConfirmPage />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}
