import { useState } from "react";
import { authApi } from "@/features/auth/api/authApi";

export function useResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await authApi.sendResetPassword(email);
      setSuccess(res.message || "Password reset email has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return { email, setEmail, loading, error, success, handleSubmit };
}
