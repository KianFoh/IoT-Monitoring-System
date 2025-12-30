import type { FormEvent } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import "./ResetPasswordForm.css";

interface ResetPasswordFormProps {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: string;
}

export const ResetPasswordForm = ({
  email,
  onEmailChange,
  onSubmit,
  isLoading = false,
  error,
  success
}: ResetPasswordFormProps) => {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="resetPasswordForm">
      {error && <div className="resetPasswordFormError">{error}</div>}
      {success && <div className="resetPasswordFormSuccess">{success}</div>}

      <Input
        id="email"
        type="email"
        label="Email Address"
        icon="📧"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="Enter your email"
        required
        disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading}>
        Send Reset Email
      </Button>
    </form>
  );
};
