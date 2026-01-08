import { Link } from "react-router-dom";
import { useEmailVerification } from "@/features/auth/hooks/useEmailVerification";
import { AuthForm, type AuthFormField } from "@/features/auth/components/AuthForm";
import { AuthSuccess } from "@/features/auth/components/AuthSuccess";
import { AuthError } from "@/features/auth/components/AuthError";
import { AuthContainer } from "@/features/auth/components/AuthContainer";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthLinks } from "@/features/auth/components/AuthLinks";
import { AuthFooter } from "@/features/auth/components/AuthFooter";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import { Card } from "@/components/Card/Card";

export function EmailVerificationPage() {
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
  } = useEmailVerification();

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
            title="Invalid Verification Link"
            message={error}
            backLink="/resend-verification"
            backLinkText="Request a new verification link"
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
            message={"Your email has been verified successfully."}
            redirectLink="/login"
            redirectText="Go to Login"
          />
        ) : (
          <>
            <AuthHeader title="Verify Your Email" subtitle="Set your password to complete verification" />
            <AuthForm
              fields={fields}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              buttonText="Verify Email & Set Password"
            />
            <AuthLinks>
              <Link to="/resend-verification" className="authLink">← Request new link</Link>
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
