import { useLogin } from "@/features/auth/hooks/useLogin";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthForm, type AuthFormField } from "@/features/auth/components/AuthForm";
import { AuthContainer } from "@/features/auth/components/AuthContainer";
import { AuthLinks } from "@/features/auth/components/AuthLinks";
import { AuthFooter } from "@/features/auth/components/AuthFooter";
import { Link } from "react-router-dom";
import { Card } from "@/components/Card/Card";


export function LoginPage() {
  const { email, setEmail, password, setPassword, handleSubmit, loading, error } = useLogin();

  const fields: AuthFormField[] = [
    {
      id: "email",
      type: "email",
      label: "Email Address",
      icon: "📧",
      value: email,
      onChange: setEmail,
      placeholder: "Enter your email",
    },
    {
      id: "password",
      type: "password",
      label: "Password",
      icon: "🔒",
      value: password,
      onChange: setPassword,
      placeholder: "Enter your password",
    },
  ];

  return (
    <AuthContainer>
      <Card>
        <AuthHeader title="Sign In" subtitle="Welcome back!" />
        <AuthForm
          fields={fields}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          buttonText="Sign In"
        />
        <AuthLinks>
          <Link to="/send-reset-password" className="authLink">Forgot Password?</Link>
          <Link to="/resend-verification" className="authLink">Resend Email Verification</Link>
        </AuthLinks>
        <AuthFooter>
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </AuthFooter>
      </Card>
    </AuthContainer>
  );
}