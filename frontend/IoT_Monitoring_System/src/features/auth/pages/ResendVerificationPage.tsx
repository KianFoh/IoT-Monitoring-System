import { useResendVerification } from "@/features/auth/hooks/useResendVerification";
import { AuthForm, type AuthFormField } from "@/features/auth/components/AuthForm";
import { AuthSuccess } from "@/features/auth/components/AuthSuccess";
import { AuthContainer } from "@/features/auth/components/AuthContainer";
import { Card} from "@/components/Card/Card";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthLinks } from "@/features/auth/components/AuthLinks";
import { AuthFooter } from "@/features/auth/components/AuthFooter";
import { Link } from "react-router-dom";

export function ResendVerificationPage() {
  const { email, setEmail, handleSubmit, loading, error, success } = useResendVerification();

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
  ];

  return (
    <AuthContainer>
      <Card>
        {success ? (
          <AuthSuccess
            title={success}
            message={"A new verification link has been sent to your email."}
            redirectLink="/login"
            redirectText="Back to Login"
          />
        ) : (
          <>
            <AuthHeader title="Resend Verification Email" subtitle="Request a new verification link" />
            <AuthForm
              fields={fields}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              buttonText="Send Verification Email"
            />
            <AuthLinks>
              <Link to="/login" className="authLink">← Back to Login</Link>
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
