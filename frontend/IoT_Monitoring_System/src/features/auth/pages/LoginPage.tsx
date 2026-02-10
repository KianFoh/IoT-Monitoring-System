import { useEffect, useState } from "react";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthForm, type AuthFormField } from "@/features/auth/components/AuthForm";
import { AuthContainer } from "@/features/auth/components/AuthContainer";
import { AuthLinks } from "@/features/auth/components/AuthLinks";
import { AuthFooter } from "@/features/auth/components/AuthFooter";
import { Link } from "react-router-dom";
import { Card } from "@/components/Card/Card";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "@/features/auth/styles/auth.module.css";
import nexevaLogo from "@/assets/logo/nexeva_logo.png";
import { fetchBranding } from "@/services/branding";
import { config } from "@/config";


export function LoginPage() {
  const { email, setEmail, password, setPassword, handleSubmit, loading, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string>(nexevaLogo);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    if (host === "manage.nexeva.io") {
      setLogoSrc(nexevaLogo);
      return;
    }

    fetchBranding(host)
      .then((branding) => {
        if (branding?.logo_url) {
          const resolved = branding.logo_url.startsWith("http")
            ? branding.logo_url
            : `${config.api.baseUrl}${branding.logo_url}`;
          setLogoSrc(resolved);
        } else {
          setLogoSrc(nexevaLogo);
        }
      })
      .catch(() => {
        setLogoSrc(nexevaLogo);
      });
  }, []);

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
  ];

  return (
    <AuthContainer>
      <Card>
        <AuthHeader title="Sign In" subtitle="Welcome back!" logoSrc={logoSrc} />
        <AuthForm
          fields={fields}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          buttonText="Sign In"
        />
        <AuthLinks>
          <Link to="/send-reset-password" className={styles["auth-Link"]}>Forgot Password?</Link>
          <Link to="/resend-verification" className={styles["auth-Link"]}>Resend Email Verification</Link>
        </AuthLinks>
        <AuthFooter>
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </AuthFooter>
      </Card>
    </AuthContainer>
  );
}
