import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/authApi";
import { api } from "@/services/api";

export function useResetPasswordConfirm() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = searchParams.get("token");
  const hasToken = Boolean(token);

  useEffect(() => {
    if (!hasToken) {
      setError("Invalid or missing token");
    }
  }, [hasToken]);

  const verifyQuery = useQuery({
    queryKey: ["reset-password", "verify-token", token],
    enabled: hasToken,
    retry: false,
    queryFn: async () => {
      api.setTokenGetter(() => token);
      await authApi.verifyResetPasswordToken();
      return true;
    },
  });

  useEffect(() => {
    if (verifyQuery.error) {
      const err = verifyQuery.error as any;
      setError(err instanceof Error ? err.message : "Reset link has expired or is invalid");
      api.setTokenGetter(() => null);
    } else if (verifyQuery.isSuccess) {
      setError("");
    }
  }, [verifyQuery.error, verifyQuery.isSuccess]);

  const resetMutation = useMutation({
    mutationFn: (payload: { password: string }) => authApi.resetPasswordConfirm(payload.password),
    onSuccess: (res) => {
      setSuccess(res.message || "Password has been reset successfully. You can now log in.");
      setError("");
      api.setTokenGetter(() => null);
      setPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      setSuccess("");
      setError(err instanceof Error ? err.message : "Failed to reset password");
    },
  });

  const handleSubmit = async () => {
    setSuccess("");
    setError("");

    if (!hasToken) {
      setError("Invalid or missing token");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Both password fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 5) {
      setError("Password must be at least 5 characters");
      return;
    }

    await resetMutation.mutateAsync({ password });
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading: resetMutation.isPending || verifyQuery.isPending,
    error,
    success,
    tokenValid: verifyQuery.isSuccess,
    isVerifying: verifyQuery.isPending,
    handleSubmit,
  };
}
