import type { FormEvent } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import "./ResendVerificationForm.css";

interface ResendVerificationFormProps {
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: string;
}

export const ResendVerificationForm = ({
  email,
  onEmailChange,
  onSubmit,
  isLoading = false,
  error,
  success
}: ResendVerificationFormProps) => {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="resendVerificationForm">
      {error && <div className="resendVerificationFormError">{error}</div>}
      {success && <div className="resendVerificationFormSuccess">{success}</div>}

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
        Resend Verification Email
      </Button>
    </form>
  );
};
