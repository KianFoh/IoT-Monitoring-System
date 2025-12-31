import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { authApi } from "@/features/auth/api/authApi";
import { api } from "@/services/api";

export function useEmailVerification() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing verification token");
      setIsVerifying(false);
      return;
    }

    const verifyToken = async () => {
      setIsVerifying(true);
      api.setTokenGetter(() => token);

      try {
        await authApi.verifyEmailToken();
        setTokenValid(true);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification link has expired or is invalid");
        setTokenValid(false);
        api.setTokenGetter(() => null);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    if (!password || !confirmPassword) {
      setError("Both password fields are required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 5) {
      setError("Password must be at least 5 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.verifyEmailConfirm(password);
      setSuccess(res.message || "Email verified successfully!");
      api.setTokenGetter(() => null);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify email");
    } finally {
      setLoading(false);
    }
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    success,
    tokenValid,
    isVerifying,
    handleSubmit,
  };
}
