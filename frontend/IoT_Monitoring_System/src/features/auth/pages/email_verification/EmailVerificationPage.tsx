import { Link } from "react-router-dom";
import { useEmailVerification } from "@/features/auth/hooks/useEmailVerification";
import { EmailVerificationForm } from "@/features/auth/components/email_verification_form/EmailVerificationForm";
import { Card } from "@/components/Card/Card";
import { EmailVerificationHeader } from "@/features/auth/components/email_verification_header/EmailVerificationHeader";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import "./EmailVerificationPage.css";

export default function EmailVerificationPage() {
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

  if (isVerifying) {
    return <LoadingScreen />;
  }

  if (!tokenValid && error) {
    return (
      <div className="emailVerificationContainer">
        <Card className="emailVerificationCard">
          <div className="emailVerificationErrorContent">
            <h2>Invalid Verification Link</h2>
            <p>{error}</p>
            <Link to="/resend-verification" className="emailVerificationLink">
              Request a new verification link
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="emailVerificationContainer">
      <Card className="emailVerificationCard">
        {success ? (
          <>
            <div className="emailVerificationSuccessContent">
              <div className="successIcon">✓</div>
              <h3>{success}</h3>
              <p className="redirectMessage">You can now log in with your credentials.</p>
              <Link to="/login" className="emailVerificationLink loginButton">
                Go to Login
              </Link>
            </div>
          </>
        ) : (
          <>
            <EmailVerificationHeader />
            <EmailVerificationForm
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              success={success}
            />
            <div className="emailVerificationLinks">
              <Link to="/resend-verification" className="emailVerificationLink">← Request new link</Link>
            </div>
          </>
        )}
        
        <div className="emailVerificationFooter">
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </div>
      </Card>
    </div>
  );
}
