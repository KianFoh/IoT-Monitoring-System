import { useResetPassword } from "@/features/auth/hooks/useResetPassword";
import { ResetPasswordForm } from "@/features/auth/components/reset_password_form/ResetPasswordForm";
import { Card } from "@/components/Card/Card";
import { ResetPasswordHeader } from "@/features/auth/components/reset_password_header/ResetPasswordHeader";
import { Link } from "react-router-dom";
import "./ResetPasswordPage.css";

export default function ResetPasswordPage() {
  const { email, setEmail, handleSubmit, loading, error, success } = useResetPassword();

  return (
    <div className="resetPasswordContainer">
      <Card className="resetPasswordCard">
        <ResetPasswordHeader />
        <ResetPasswordForm
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleSubmit}
          isLoading={loading}
          error={error}
          success={success}
        />
        <div className="resetPasswordLinks">
          <Link to="/login" className="resetPasswordLink">← Back to Login</Link>
        </div>
        <div className="resetPasswordFooter">
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </div>
      </Card>
    </div>
  );
}
