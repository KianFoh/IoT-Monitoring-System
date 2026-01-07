import { useState, useEffect } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { wsManager } from "@/services/ws";
import { api } from "@/services/api";
import type { User } from "@/types/auth";

export function useAuthInit() {
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const data = await authApi.refreshToken();
        setAccessToken(data.access_token);
        wsManager.setTokenGetter(() => data.access_token);
        api.setTokenGetter(() => data.access_token);
        
        setUser(data.user);
        setIsLoggedIn(true);
      } catch {
        setAccessToken(null);
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        setIsAuthChecked(true);
      }
    }
    initAuth();
  }, []);

  return { access_token, setAccessToken, user, setUser, isLoggedIn, setIsLoggedIn, isAuthChecked };
}