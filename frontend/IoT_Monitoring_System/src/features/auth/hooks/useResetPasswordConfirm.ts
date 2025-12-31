import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { authApi } from "@/features/auth/api/authApi";
import { api } from "@/services/api";

export function useResetPasswordConfirm() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const token = searchParams.get("token");

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setError("Invalid or missing token");
      setIsVerifying(false);
      return;
    }

    const verifyToken = async () => {
      setIsVerifying(true);
      api.setTokenGetter(() => token);
      try {
        await authApi.verifyResetPasswordToken();
        setTokenValid(true);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reset link has expired or is invalid");
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
    setSuccess("");

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

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.resetPasswordConfirm(password);
      setSuccess(res.message || "Password has been reset successfully. You can now log in.");
      api.setTokenGetter(() => null);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
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
