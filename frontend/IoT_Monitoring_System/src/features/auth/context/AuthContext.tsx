import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthInit } from "@/features/auth/hooks/useAuthInit";
import { wsManager } from "@/services/ws";
import { api } from "@/services/api";
import type { AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { access_token, setAccessToken, user, setUser, isLoggedIn, setIsLoggedIn, isAuthChecked } = useAuthInit();

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setAccessToken(data.access_token);
    wsManager.setTokenGetter(() => data.access_token);
    api.setTokenGetter(() => data.access_token);
    setUser(data.user);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, access_token, user, login, logout, isAuthChecked, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
