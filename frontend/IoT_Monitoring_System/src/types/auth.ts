 import type { FormEvent } from "react"; 

export interface LoginFormProps {
  email: string;
  password: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}


