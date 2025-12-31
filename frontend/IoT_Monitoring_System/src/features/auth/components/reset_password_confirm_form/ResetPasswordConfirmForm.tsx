import type { FormEvent } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import "./ResetPasswordConfirmForm.css";

interface ResetPasswordConfirmFormProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: string;
}

export const ResetPasswordConfirmForm = ({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  isLoading = false,
  error,
  success
}: ResetPasswordConfirmFormProps) => {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="resetPasswordConfirmForm">
      {error && <div className="resetPasswordConfirmFormError">{error}</div>}
      {success && <div className="resetPasswordConfirmFormSuccess">{success}</div>}

      <Input
        id="password"
        type="password"
        label="New Password"
        icon="🔒"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        placeholder="Enter new password"
        required
        disabled={isLoading}
      />

      <Input
        id="confirmPassword"
        type="password"
        label="Confirm Password"
        icon="🔒"
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
        placeholder="Confirm your password"
        required
        disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading}>
        Reset Password
      </Button>
    </form>
  );
};
