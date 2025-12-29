import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  accessToken: string | null;
  isAuthChecked: boolean;       // expose loading state
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false); // important!

  // On app load, try to get a new access token using refresh token cookie
  useEffect(() => {
    async function initAuth() {
      try {
        const res = await fetch("/api/refresh-token", {
          method: "POST",
          credentials: "include", // sends HTTP-only cookie
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setIsLoggedIn(true);
        } else {
          setAccessToken(null);
          setIsLoggedIn(false);
        }
      } catch {
        setAccessToken(null);
        setIsLoggedIn(false);
      } finally {
        setIsAuthChecked(true); // ✅ mark that auth check finished
      }
    }
    initAuth();
  }, []);

  const login = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: "demo", password: "demo" }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    setAccessToken(data.accessToken);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setAccessToken(null);
    setIsLoggedIn(false);
    fetch("/api/logout", { method: "POST", credentials: "include" });
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, accessToken, login, logout, isAuthChecked }}
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
