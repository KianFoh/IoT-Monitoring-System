import { useState } from "react";
import { Link } from "react-router-dom";
import { useEmailVerification } from "./useEmailVerification";
import { AuthForm, type AuthFormField } from "@/features/auth/components/AuthForm/AuthForm";
import { AuthSuccess } from "@/features/auth/components/AuthSuccess/AuthSuccess";
import { AuthError } from "@/features/auth/components/AuthError/AuthError";
import { AuthContainer } from "@/features/auth/components/AuthContainer/AuthContainer";
import { AuthHeader } from "@/features/auth/components/AuthHeader/AuthHeader";
import { AuthLinks } from "@/features/auth/components/AuthLinks/AuthLinks";
import { AuthFooter } from "@/features/auth/components/AuthFooter/AuthFooter";
import { LoadingScreen } from "@/components/Loading/LoadingScreen";
import { Card } from "@/components/Card/Card";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./EmailVerification.module.css";

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
              <Link to="/resend-verification" className={styles["auth-Link"]}>{"\u2190"} Request new link</Link>
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
