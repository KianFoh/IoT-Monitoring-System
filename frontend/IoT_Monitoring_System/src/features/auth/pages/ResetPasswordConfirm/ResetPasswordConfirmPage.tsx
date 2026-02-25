import { useState } from "react";
import { Link } from "react-router-dom";
import { useResetPasswordConfirm } from "@/features/auth/hooks/useResetPasswordConfirm";
import { AuthForm, type AuthFormField } from "@/features/auth/components/AuthForm/AuthForm";
import { AuthSuccess } from "@/features/auth/components/AuthSuccess/AuthSuccess";
import { AuthError } from "@/features/auth/components/AuthError/AuthError";
import { AuthContainer } from "@/features/auth/components/AuthContainer/AuthContainer";
import { Card} from "@/components/Card/Card";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { AuthHeader } from "@/features/auth/components/AuthHeader/AuthHeader";
import { AuthLinks } from "@/features/auth/components/AuthLinks/AuthLinks";
import { AuthFooter } from "@/features/auth/components/AuthFooter/AuthFooter";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import styles from "./ResetPasswordConfirm.module.css";

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fields: AuthFormField[] = [
    {
      id: "password",
      type: showPassword ? "text" : "password",
      label: "Password",
      icon: "\u{1F512}",
      value: password,
      onChange: setPassword,
      placeholder: "Enter your password",
      rightIcon: showPassword ? FaEyeSlash : FaEye,
      rightIconLabel: showPassword ? "Hide password" : "Show password",
      onRightIconClick: () => setShowPassword((prev) => !prev),
    },
    {
      id: "confirmPassword",
      type: showConfirmPassword ? "text" : "password",
      label: "Confirm Password",
      icon: "\u{1F512}",
      value: confirmPassword,
      onChange: setConfirmPassword,
      placeholder: "Confirm your password",
      rightIcon: showConfirmPassword ? FaEyeSlash : FaEye,
      rightIconLabel: showConfirmPassword ? "Hide password" : "Show password",
      onRightIconClick: () => setShowConfirmPassword((prev) => !prev),
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
              <Link to="/send-reset-password" className={styles["auth-Link"]}>{"\u2190"} Request new link</Link>
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
