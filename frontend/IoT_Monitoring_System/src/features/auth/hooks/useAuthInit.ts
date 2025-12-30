import { useState, useEffect } from "react";
import { authApi } from "@/features/auth/api/authApi";

export function useAuthInit() {
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const data = await authApi.refreshToken();
        setAccessToken(data.access_token);
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

  return { access_token, setAccessToken, isLoggedIn, setIsLoggedIn, isAuthChecked };
}