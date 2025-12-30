import { useResendVerification } from "@/features/auth/hooks/useResendVerification";
import { ResendVerificationForm } from "@/features/auth/components/resend_verification_form/ResendVerificationForm";
import { Card } from "@/components/Card/Card";
import { ResendVerificationHeader } from "@/features/auth/components/resend_verification_header/ResendVerificationHeader";
import { Link } from "react-router-dom";
import "./ResendVerificationPage.css";

export default function ResendVerificationPage() {
  const { email, setEmail, handleSubmit, loading, error, success } = useResendVerification();

  return (
    <div className="resendVerificationContainer">
      <Card className="resendVerificationCard">
        <ResendVerificationHeader />
        <ResendVerificationForm
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleSubmit}
          isLoading={loading}
          error={error}
          success={success}
        />
        <div className="resendVerificationLinks">
          <Link to="/login" className="resendVerificationLink">← Back to Login</Link>
        </div>
        <div className="resendVerificationFooter">
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </div>
      </Card>
    </div>
  );
}
