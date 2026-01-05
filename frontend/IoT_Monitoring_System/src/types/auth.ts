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

export interface User {
        email: string;
        department_id: number | null;
        role: "admin" | "user" | "superuser";
        id: number;
        is_verified: boolean;
        is_active: boolean;
        last_login: string;
        created_at: string;
    }

export interface AuthContextType {
  isLoggedIn: boolean;
  access_token: string | null;
  isAuthChecked: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}
