import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthInit } from "@/features/auth/hooks/useAuthInit";
import { api } from "@/services/api";

interface AuthContextType {
  isLoggedIn: boolean;
  access_token: string | null;
  isAuthChecked: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { access_token, setAccessToken, isLoggedIn, setIsLoggedIn, isAuthChecked } = useAuthInit();

  api.setTokenGetter(() => access_token);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setAccessToken(data.access_token);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, access_token, login, logout, isAuthChecked }}
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
