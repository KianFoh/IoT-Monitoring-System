import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { User } from "@/types/user";
export type { User } from "@/types/user";

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

export interface AuthContextType {
  isLoggedIn: boolean;
  access_token: string | null;
  isAuthChecked: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: Dispatch<SetStateAction<User | null>>;
}
