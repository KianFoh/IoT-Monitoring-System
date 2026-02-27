import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/authApi";
import { api } from "@/services/api";

export function useEmailVerification() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = searchParams.get("token");
  const hasToken = Boolean(token);

  useEffect(() => {
    if (!hasToken) {
      setError("Invalid or missing verification token");
    }
  }, [hasToken]);

  const verifyQuery = useQuery({
    queryKey: ["verify-email-token", token],
    enabled: hasToken,
    retry: false,
    queryFn: async () => {
      api.setTokenGetter(() => token);
      await authApi.verifyEmailToken();
      return true;
    },
  });

  useEffect(() => {
    if (verifyQuery.error) {
      const err = verifyQuery.error as any;
      setError(err instanceof Error ? err.message : "Verification link has expired or is invalid");
      api.setTokenGetter(() => null);
    } else if (verifyQuery.isSuccess) {
      setError("");
    }
  }, [verifyQuery.error, verifyQuery.isSuccess]);

  const confirmMutation = useMutation({
    mutationFn: (payload: { password: string }) => authApi.verifyEmailConfirm(payload.password),
    onSuccess: (res) => {
      setSuccess(res.message || "Email verified successfully!");
      setError("");
      api.setTokenGetter(() => null);
      setPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      setSuccess("");
      setError(err instanceof Error ? err.message : "Failed to verify email");
    },
  });

  const handleSubmit = async () => {
    setSuccess("");
    setError("");

    if (!hasToken) {
      setError("Invalid or missing verification token");
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

    await confirmMutation.mutateAsync({ password });
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading: confirmMutation.isPending || verifyQuery.isPending,
    error,
    success,
    tokenValid: verifyQuery.isSuccess,
    isVerifying: verifyQuery.isPending,
    handleSubmit,
  };
}
