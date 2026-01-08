import { Link } from "react-router-dom";
import { useResetPasswordConfirm } from "@/features/auth/hooks/useResetPasswordConfirm";
import { AuthForm, type AuthFormField } from "@/features/auth/components/AuthForm";
import { AuthSuccess } from "@/features/auth/components/AuthSuccess";
import { AuthError } from "@/features/auth/components/AuthError";
import { AuthContainer } from "@/features/auth/components/AuthContainer";
import { Card} from "@/components/Card/Card";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthLinks } from "@/features/auth/components/AuthLinks";
import { AuthFooter } from "@/features/auth/components/AuthFooter";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";

export function ResetPasswordConfirmPage() {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    error,
    success,
    tokenValid,
    isVerifying,
    handleSubmit,
  } = useResetPasswordConfirm();

  const fields: AuthFormField[] = [
    {
      id: "password",
      type: "password",
      label: "Password",
      icon: "🔒",
      value: password,
      onChange: setPassword,
      placeholder: "Enter your password (min 8 characters)",
    },
    {
      id: "confirmPassword",
      type: "password",
      label: "Confirm Password",
      icon: "🔒",
      value: confirmPassword,
      onChange: setConfirmPassword,
      placeholder: "Confirm your password",
    },
  ];

  if (isVerifying) {
    return <LoadingScreen />;
  }

  if (!tokenValid && error) {
    return (
      <AuthContainer>
        <Card>
          <AuthError
            title="Invalid Reset Link"
            message={error}
            backLink="/send-reset-password"
            backLinkText="Request a new reset link"
          />
        </Card>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer>
      <Card>
        {success ? (
          <AuthSuccess
            title={success}
            message={"Your password has been reset successfully."}
            redirectLink="/login"
            redirectText="Go to Login"
          />
        ) : (
          <>
            <AuthHeader title="Reset Your Password" subtitle="Enter your new password below" />
            <AuthForm
              fields={fields}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              buttonText="Reset Password"
            />
            <AuthLinks>
              <Link to="/send-reset-password" className="authLink">← Request new link</Link>
            </AuthLinks>
          </>
        )}
        <AuthFooter>
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </AuthFooter>
      </Card>
    </AuthContainer>
  );
}
