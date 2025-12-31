import { Link } from "react-router-dom";
import { useResetPasswordConfirm } from "@/features/auth/hooks/useResetPasswordConfirm";
import { ResetPasswordConfirmForm } from "@/features/auth/components/reset_password_confirm_form/ResetPasswordConfirmForm";
import { Card } from "@/components/Card/Card";
import { ResetPasswordConfirmHeader } from "@/features/auth/components/reset_password_confirm_header/ResetPasswordConfirmHeader";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import "./ResetPasswordConfirmPage.css";

export default function ResetPasswordConfirmPage() {
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

  if (isVerifying) {
    return <LoadingScreen />;
  }

  if (!tokenValid && error) {
    return (
      <div className="resetPasswordConfirmContainer">
        <Card className="resetPasswordConfirmCard">
          <div className="resetPasswordConfirmErrorContent">
            <h2>Invalid Reset Link</h2>
            <p>{error}</p>
            <Link to="/send-reset-password" className="resetPasswordConfirmLink">
              Request a new reset link
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="resetPasswordConfirmContainer">
      <Card className="resetPasswordConfirmCard">
        {success ? (
          <>
            <div className="resetPasswordSuccessContent">
              <div className="successIcon">✓</div>
              <h3>{success}</h3>
              <p className="redirectMessage">You can now log in with your new password.</p>
              <Link to="/login" className="resetPasswordConfirmLink loginButton">
                Go to Login
              </Link>
            </div>
          </>
        ) : (
          <>
            <ResetPasswordConfirmHeader />
            <ResetPasswordConfirmForm
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onSubmit={handleSubmit}
              isLoading={loading}
              error={error}
              success={success}
            />
            <div className="resetPasswordConfirmLinks">
              <Link to="/send-reset-password" className="resetPasswordConfirmLink">← Request new link</Link>
            </div>
          </>
        )}
        
        <div className="resetPasswordConfirmFooter">
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </div>
      </Card>
    </div>
  );
}
