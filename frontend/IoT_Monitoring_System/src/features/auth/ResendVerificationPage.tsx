import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/Card/Card";
import Input from "@/components/Input/Input";
import Button from "@/components/Button/Button";
import api from "@/services/api";
import "./ResendVerificationPage.css";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0); // seconds

  // Optional: prefill from query (?email=)
  const prefilledEmail = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("email") ?? "";
  }, []);
  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.post<{ detail: string }>("/auth/resend-verification", {
        email: email.trim(),
      });
      setMessage(res.detail || "Verification email sent.");
      setCooldown(30); // UI throttle
    } catch (err: any) {
      setError(err?.message ?? "Failed to send verification email.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown || submitting) return;
    await handleSubmit();
  };

  return (
    <div className="verifyContainer">
      <Card className="verifyCard">
        <header className="verifyHeader">
          <h1 className="verifyTitle">Resend verification</h1>
          <p className="verifySubtitle">
            Enter your account email and we’ll send a new verification link.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="verifyForm">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {message && <div className="verifyMessage success">{message}</div>}
          {error && <div className="verifyMessage error">{error}</div>}

          <div className="verifyActions">
            <Button type="submit" loading={submitting} disabled={submitting}>
              Send verification email
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleResend}
              disabled={submitting || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
            </Button>
          </div>
        </form>

        <div className="verifyFooter">
          <Link className="verifyBackLink" to="/login">
            ← Back to login
          </Link>
        </div>
      </Card>
    </div>
  );
}