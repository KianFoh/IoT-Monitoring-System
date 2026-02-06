import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { LoginFormData } from "@/types/auth";

export function useLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isProd = import.meta.env.MODE === "production";

  const getErrorMessage = (err: unknown) => {
    if (err && typeof err === "object") {
      const response = (err as { response?: { data?: { detail?: unknown } } }).response;
      const detail = response?.data?.detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { msg?: string };
        if (first?.msg) return first.msg;
      }
      const message = (err as { message?: string }).message;
      if (message && !isProd) return message;
    }
    return isProd ? "Login failed. Check your credentials." : "Login failed";
  };

  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormData) => login(payload.email, payload.password),
    onError: (err: unknown) => {
      setError(getErrorMessage(err));
    },
    onSuccess: () => setError(""),
  });

  const handleSubmit = async (e: FormEvent | LoginFormData) => {
    let formData: LoginFormData;

    if ("preventDefault" in e) {
      e.preventDefault();
      formData = { email, password };
    } else {
      formData = e;
    }

    await loginMutation.mutateAsync(formData);
  };

  return { email, setEmail, password, setPassword, handleSubmit, loading: loginMutation.isPending, error };
}
