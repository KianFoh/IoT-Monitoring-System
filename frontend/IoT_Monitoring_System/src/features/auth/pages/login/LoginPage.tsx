import { useLogin } from "@/features/auth/hooks/useLogin";
import { LoginForm } from "@/features/auth/components/login_form/LoginForm";
import { Card } from "@/components/Card/Card";
import { LoginHeader } from "@/features/auth/components/login_header/LoginHeader";
import { Link } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  const { email, setEmail, password, setPassword, handleSubmit, loading, error } = useLogin();

  return (
    <div className="loginContainer">
      <Card className="loginCard">
        <LoginHeader />
        <LoginForm
          email={email}
          password={password}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          isLoading={loading}
          error={error}
        />
        <div className="loginLinks">
          <Link to="/reset-password" className="loginLink">Forgot Password?</Link>
          <Link to="/verify-email" className="loginLink">Send email verification</Link>
        </div>
        <div className="loginFooter">
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </div>
      </Card>
    </div>
  );
}
