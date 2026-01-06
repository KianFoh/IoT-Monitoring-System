import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthInit } from "@/features/auth/hooks/useAuthInit";
import { api } from "@/services/api";
import type { AuthContextType } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { access_token, setAccessToken, user, setUser, isLoggedIn, setIsLoggedIn, isAuthChecked } = useAuthInit();

  // Set token getter for both API and WebSocket
  useEffect(() => {
    const tokenGetter = () => access_token;
    api.setTokenGetter(tokenGetter);
    
  }, [access_token]);

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
