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

  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormData) => login(payload.email, payload.password),
    onError: (err: any) => {
      setError(err instanceof Error ? err.message : "Login failed");
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
