import { useAuth } from "@/features/auth/context/AuthContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/Card/Card";
import { LoginHeader } from "./components/LoginHeader";
import { LoginForm } from "./components/LoginForm";
import "./LoginPage.css";

function Login() {
  const { login } = useAuth();
  const [error, setError] = useState("");

  const handleLogin = async (email: string, password: string) => {
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  return (
    <div className="loginContainer">
      <Card className="loginCard">
        <LoginHeader />
        <LoginForm onSubmit={handleLogin} error={error} />
        <div className="loginLinks">
          <Link to="/reset-password" className="loginLink">Forgot Password?</Link>
          <Link to="/verify-email" className="loginLink">Send email verification</Link>
        </div>
        <div className="loginFooter">
          <p>IoT Monitoring System &copy; {new Date().getFullYear()}</p>
        </div>
      </Card>
    </div>
  );
}

export default Login;
