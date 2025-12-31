import type { FormEvent } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import "./EmailVerificationForm.css";

interface Props {
  password: string;
  confirmPassword: string;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onSubmit: () => Promise<void>;
  loading?: boolean;
  error?: string;
  success?: string;
}

export const EmailVerificationForm = ({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  loading = false,
  error,
  success,
}: Props) => {
  const isSuccess = !!success;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <form onSubmit={submit} className="emailVerificationForm">
      {error && <div className="formError">{error}</div>}
      {success && <div className="formSuccess">{success}</div>}

      <Input
        id="password"
        type="password"
        label="Password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        placeholder="Enter your password (min 5 characters)"
        required
        disabled={loading || isSuccess}
      />

      <Input
        id="confirmPassword"
        type="password"
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
        placeholder="Confirm your password"
        required
        disabled={loading || isSuccess}
      />

      <Button type="submit" isLoading={loading} disabled={isSuccess}>
        {isSuccess ? "✓ Email Verified" : "Set Password"}
      </Button>
    </form>
  );
};
