import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/authApi";

export function useResendVerification() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resendMutation = useMutation({
    mutationFn: (payload: { email: string }) => authApi.resendVerificationEmail(payload.email),
    onSuccess: (response) => {
      setSuccess(response.message || "Verification email has been sent");
      setError("");
    },
    onError: (err: any) => {
      setSuccess("");
      setError(err instanceof Error ? err.message : "Failed to send verification email.");
    },
  });

  const handleSubmit = async () => {
    setSuccess("");
    setError("");
    await resendMutation.mutateAsync({ email });
  };

  return { email, setEmail, loading: resendMutation.isPending, error, success, handleSubmit };
}
