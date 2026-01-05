import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthInit } from "@/features/auth/hooks/useAuthInit";
import { api } from "@/services/api";
import type { User } from "@/types/auth";

interface AuthContextType {
  isLoggedIn: boolean;
  access_token: string | null;
  isAuthChecked: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAccessToken: (access_token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { access_token, setAccessToken, isLoggedIn, setIsLoggedIn, isAuthChecked } = useAuthInit();
  const [user, setUser] = useState<User | null>(null);

  api.setTokenGetter(() => access_token);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setAccessToken(data.access_token);
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
      value={{ isLoggedIn, access_token, user, login, logout, isAuthChecked, setAccessToken }}
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
