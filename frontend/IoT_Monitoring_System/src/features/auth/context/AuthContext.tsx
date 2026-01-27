import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/authApi";
import { ALL_CHANNELS, type WSChannel, wsManager } from "@/services/ws";
import { api } from "@/services/api";
import type { AuthContextType, User } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getWsChannelsForRole = (role?: User["role"] | null): WSChannel[] => {
  if (role === "superuser") {
    return ALL_CHANNELS;
  }
  if (role === "user") {
    return ["device_status", "device"];
  }
  return [];
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  // persisted-in-memory token used by interceptors / ws manager
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  // tokenRef holds the current token
  const tokenRef = useRef<string | null>(null);
  // when a reconnect is triggered by refresh, skip the next invalidate
  const skipNextReconnectInvalidate = useRef(false);

  // update tokenRef so api/ws handlers read the latest token
  const syncToken = useCallback((token: string | null) => {
    tokenRef.current = token;
  }, []);

  // clear all client-side session state and disconnect websockets
  const clearSession = useCallback(() => {
    syncToken(null);
    setAccessToken(null);
    setUser(null);
    wsManager.disconnectAll();
  }, [syncToken]);

  // establishSession:
  // 1) sync tokenRef so api/ws can use it
  // 2) wait for ws connections (reconnectAll / connectAll) to finish BEFORE updating React state
  //    this prevents UI components from fetching data (causing early API calls)
  const establishSession = useCallback(
    async (token: string, nextUser: User, options?: { reconnectWs?: boolean }) => {
      syncToken(token);
      const shouldReconnect = options?.reconnectWs ?? true;
      const channels = getWsChannelsForRole(nextUser?.role);
      try {
        if (shouldReconnect) {
          await wsManager.reconnectAll(channels, { manual: true, keepListeners: true });
        } else {
          await wsManager.connectAll(channels);
        }
        // update React-visible auth state only after WS is ready
        setAccessToken(token);
        setUser(nextUser);
      } catch (err) {
        // rollback tokenRef on failure
        syncToken(null);
        throw err;
      }
    },
    [syncToken]
  );

  // refreshSession used by interceptors/ws to refresh tokens
  // re-establishes WS after getting a fresh token
  const refreshSession = useCallback(async () => {
    skipNextReconnectInvalidate.current = true;
    try {
      const data = await authApi.refreshToken();
      await establishSession(data.access_token, data.user, { reconnectWs: true });
      return data.access_token;
    } catch (err) {
      skipNextReconnectInvalidate.current = false;
      throw err;
    }
  }, [establishSession]);

  useEffect(() => {
    // register token/getter/refresh handlers so api/ws can call back into this context
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

    const unsubscribeReconnect = wsManager.onReconnect(() => {
      // If WS reconnected after a drop, invalidate cached data to backfill missed events
      if (skipNextReconnectInvalidate.current) {
        skipNextReconnectInvalidate.current = false;
        return;
      }
      queryClient.invalidateQueries();
    });

    return () => {
      unsubscribeReconnect();
    };
  }, [refreshSession, clearSession, queryClient]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // attempt to restore session on app load without reconnecting WS automatically
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
      // wait for WS to reconnect using the new token before exposing auth state
      await establishSession(data.access_token, data.user, { reconnectWs: true });
      setIsAuthChecked(true);
    },
    [establishSession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // make sure client state is cleared and sockets closed even if logout API fails
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
