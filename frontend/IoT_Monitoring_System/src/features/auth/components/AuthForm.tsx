import type { FormEvent } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";

export interface AuthFormField {
  id: string;
  type: "text" | "email" | "password";
  label: string;
  icon?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

interface Props {
  fields: AuthFormField[];
  onSubmit: (e: FormEvent) => Promise<void>;
  loading?: boolean;
  error?: string;
  success?: string;
  buttonText?: string;
}

export const AuthForm = ({
  fields,
  onSubmit,
  loading = false,
  error,
  success,
  buttonText = "Submit",
}: Props) => {
  const isSuccess = !!success;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  return (
    <form onSubmit={submit} className="authForm">
      {error && <div className="authFormError">{error}</div>}
      {success && <div className="authFormSuccess">{success}</div>}

      {fields.map((field) => (
        <Input
          key={field.id}
          id={field.id}
          type={field.type}
          label={field.label}
          icon={field.icon}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          placeholder={field.placeholder}
          required
          disabled={loading || isSuccess}
        />
      ))}

      <Button type="submit" isLoading={loading} disabled={isSuccess}>
        {isSuccess ? "✓ Success" : buttonText}
      </Button>
    </form>
  );
};
