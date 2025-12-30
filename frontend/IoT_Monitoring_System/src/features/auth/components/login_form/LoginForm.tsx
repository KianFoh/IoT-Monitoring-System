import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import "./LoginForm.css";
import type { LoginFormProps } from "@/types/auth";

export const LoginForm = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  isLoading = false,
  error
}: LoginFormProps) => {
  return (
    <form onSubmit={onSubmit} className="loginForm">
      {error && <div className="loginFormError">{error}</div>}

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

      <Input
        id="password"
        type="password"
        label="Password"
        icon="🔒"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
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
