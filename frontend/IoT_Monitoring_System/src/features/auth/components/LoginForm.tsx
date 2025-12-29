import { useState } from "react";
import type  {FormEvent } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import "./LoginForm.css";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string;
}

export const LoginForm = ({ onSubmit, error }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="loginForm">
      {error && <div className="loginFormError">{error}</div>}

      <Input
        id="email"
        type="email"
        label="Email Address"
        icon="📧"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        disabled={isLoading}
      />

      <Input
        id="password"
        type="password"
        label="Password"
        icon="🔒"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading}>
        Sign In
      </Button>
    </form>
  );
};
