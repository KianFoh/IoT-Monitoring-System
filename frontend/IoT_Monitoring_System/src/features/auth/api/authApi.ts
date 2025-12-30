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
  }
};