import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage, EmailVerificationPage, ResendVerificationPage, ResetPasswordPage, ResetPasswordConfirmPage } from "@/features/auth";
import { ProtectedRoute } from "./ProtectedRoute";
import { SuperuserRoute } from "./SuperuserRoute";
import { GuestRoute } from "./GuestRoute";
import { DashboardLayout, DashboardHome, CustomersPage, DistributorsPage, DepartmentPage, DevicesPage, DeviceDashboardPage, MqttUserPage, SettingsPage, UsersPage } from "@/features/dashboard";

export default function AppRoutes() {

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
          <Route path="settings" element={<SettingsPage />} />
          <Route element={<SuperuserRoute />}>
            <Route path="devices/:deviceUid" element={<DeviceDashboardPage />} />
            <Route path="distributors" element={<DistributorsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="departments" element={<DepartmentPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="mqtt-users" element={<MqttUserPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
