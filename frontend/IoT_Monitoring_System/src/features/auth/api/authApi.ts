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
};