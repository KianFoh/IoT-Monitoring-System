import "./LoginHeader.css";

interface LoginHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: string;
}

export const LoginHeader = ({
  title = "Welcome Back",
  subtitle = "Sign in to your IoT Monitoring System",
  icon = "🔐",
}: LoginHeaderProps) => {
  return (
    <div className="loginHeader">
      <div className="loginLogo">
        <span className="loginLogoIcon">{icon}</span>
      </div>
      <h1 className="loginTitle">{title}</h1>
      <p className="loginSubtitle">{subtitle}</p>
    </div>
  );
};
