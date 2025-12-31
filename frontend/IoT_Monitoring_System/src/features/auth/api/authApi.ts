import { api } from "@/services/api";

export const authApi = {
  login: async (email: string, password: string) => {
    return api.post<{ access_token: string }>("/auth/login", { email, password });
  },

  logout: async () => {
    return api.post("/auth/logout");
  },

  refreshToken: async () => {
    return api.post<{ access_token: string }>("/auth/refresh-token");
  },

  resendVerificationEmail: async (email: string) => {
    return api.post<{ message: string }>("/auth/send-verification", { email });
  },

  sendResetPassword: async (email: string) => {
    return api.post<{ message: string }>("/auth/request-password-reset", { email });
  },

  verifyResetPasswordToken: async () => {
    return api.get<{ valid: boolean }>("/auth/check-reset-password-token");
  },

  verifyEmailToken: async () => {
    return api.get<{ message: string }>("/auth/check-verify-password-token");
  },

  resetPasswordConfirm: async (new_password: string) => {
    return api.post<{ message: string }>("/auth/reset-password", { new_password });
  },

  verifyEmailConfirm: async (password: string) => {
    return api.post<{ message: string }>("/auth/set-password", { password });
  }
};