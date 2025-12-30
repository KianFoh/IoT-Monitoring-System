import { useState } from "react";
import { authApi } from "@/features/auth/api/authApi";

export function useResendVerification() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await authApi.resendVerificationEmail(email);
      setSuccess(response.message || "Verification email has been sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification email.");
    } finally {
      setLoading(false);
    }
  };

  return { email, setEmail, loading, error, success, handleSubmit };
}