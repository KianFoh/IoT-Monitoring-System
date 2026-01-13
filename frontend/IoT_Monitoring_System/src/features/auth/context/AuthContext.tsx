import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { wsManager } from "@/services/ws";
import { api } from "@/services/api";
import type { AuthContextType, User } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const syncToken = useCallback((token: string | null) => {
    tokenRef.current = token;
  }, []);

  const clearSession = useCallback(() => {
    syncToken(null);
    setAccessToken(null);
    setUser(null);
    wsManager.disconnectAll();
  }, [syncToken]);

  const establishSession = useCallback(
    async (token: string, nextUser: User, options?: { reconnectWs?: boolean }) => {
      syncToken(token);
      const shouldReconnect = options?.reconnectWs ?? true;
      try {
        if (shouldReconnect) {
          await wsManager.reconnectAll(undefined, { manual: true });
        } else {
          await wsManager.connectAll();
        }
        setAccessToken(token);
        setUser(nextUser);
      } catch (err) {
        syncToken(null);
        throw err;
      }
    },
    [syncToken]
  );

  const refreshSession = useCallback(async () => {
    const data = await authApi.refreshToken();
    await establishSession(data.access_token, data.user, { reconnectWs: true });
    return data.access_token;
  }, [establishSession]);

  useEffect(() => {
    api.setAuthHandlers({
      getToken: () => tokenRef.current,
      refreshToken: refreshSession,
      onRefreshFailure: () => {
        clearSession();
        setIsAuthChecked(true);
      },
    });
    wsManager.setTokenGetter(() => tokenRef.current);
    wsManager.setAuthHandlers({
      refreshToken: refreshSession,
      onAuthFailure: () => {
        clearSession();
        setIsAuthChecked(true);
      },
    });
  }, [refreshSession, clearSession]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await authApi.refreshToken();
        await establishSession(data.access_token, data.user, { reconnectWs: false });
      } catch {
        clearSession();
      } finally {
        setIsAuthChecked(true);
      }
    };

    initAuth();
  }, [establishSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
      await establishSession(data.access_token, data.user, { reconnectWs: true });
      setIsAuthChecked(true);
    },
    [establishSession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      setIsAuthChecked(true);
    }
  }, [clearSession]);

  const isLoggedIn = Boolean(access_token && user);

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
