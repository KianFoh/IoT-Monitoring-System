import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
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
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const data = await api.post<{ access_token: string }>(
          "/auth/refresh-token"
        );
        setAccessToken(data.access_token);
        api.setTokenGetter(() => data.access_token);
        setIsLoggedIn(true);
      } catch {
        setAccessToken(null);
        setIsLoggedIn(false);
      } finally {
        setIsAuthChecked(true);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ access_token: string }>(
      "/auth/login",
      {
        email,
        password,
      }
    );
    setAccessToken(data.access_token);
    api.setTokenGetter(() => data.access_token);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
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
