import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import type { LoginFormData } from "@/types/auth";

export function useLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent | LoginFormData) => {
    let formData: LoginFormData;

    if ("preventDefault" in e) {
      e.preventDefault();
      formData = { email, password };
    } else {
      formData = e;
    }

    setLoading(true);
    setError("");

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return { email, setEmail, password, setPassword, handleSubmit, loading, error };
}
