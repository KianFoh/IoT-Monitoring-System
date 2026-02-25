import type { FormEvent, ReactNode, ElementType } from "react";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import styles from "./AuthForm.module.css";

export interface AuthFormField {
  id: string;
  type: "text" | "email" | "password";
  label: string;
  icon?: string;
  rightIcon?: ReactNode | ElementType;
  rightIconLabel?: string;
  onRightIconClick?: () => void;
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
    <form onSubmit={submit} className={styles["auth-Form"]}>
      {error && <div className={styles["auth-FormError"]}>{error}</div>}
      {success && <div className={styles["auth-FormSuccess"]}>{success}</div>}

      {fields.map((field) => (
        <Input
          key={field.id}
          id={field.id}
          type={field.type}
          label={field.label}
          icon={field.icon}
          rightIcon={field.rightIcon}
          rightIconLabel={field.rightIconLabel}
          onRightIconClick={field.onRightIconClick}
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          placeholder={field.placeholder}
          required
          disabled={loading || isSuccess}
        />
      ))}

      <Button type="submit" isLoading={loading} disabled={isSuccess}>
        {isSuccess ? "\u2713 Success" : buttonText}
      </Button>
    </form>
  );
};
