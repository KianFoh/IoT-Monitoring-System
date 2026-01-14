import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/authApi";

export function useResetPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetMutation = useMutation({
    mutationFn: (payload: { email: string }) => authApi.sendResetPassword(payload.email),
    onSuccess: (res) => {
      setSuccess(res.message || "Password reset email has been sent.");
      setError("");
    },
    onError: (err: any) => {
      setSuccess("");
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    },
  });

  const handleSubmit = async () => {
    setSuccess("");
    setError("");
    await resetMutation.mutateAsync({ email });
  };

  return { email, setEmail, loading: resetMutation.isPending, error, success, handleSubmit };
}
