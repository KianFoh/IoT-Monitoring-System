import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/context/AuthContext";import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import { LoginPage, EmailVerificationPage, ResendVerificationPage, ResetPasswordPage, ResetPasswordConfirmPage } from "@/features/auth";
import { ProtectedRoute } from "./ProtectedRoute";
import { GuestRoute } from "./GuestRoute";
import { DashboardLayout, DashboardHome, CustomersPage, DevicesPage, MqttUserPage, SettingsPage, UsersPage } from "@/features/dashboard";

export default function AppRoutes() {
  const { isAuthChecked } = useAuth();

  if (!isAuthChecked) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Guest-only routes */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/send-reset-password" element={<ResetPasswordPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/reset-password" element={<ResetPasswordConfirmPage />} />
      </Route>

      {/* Authenticated routes */}
      <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="mqtt-users" element={<MqttUserPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
