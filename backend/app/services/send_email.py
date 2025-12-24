from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from app.core.config import get_settings

settings = get_settings()

# ==================== SMTP Email Sending ====================
def _send_email_smtp(to_email: str, subject: str, html_body: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        if int(settings.SMTP_PORT) == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"SMTP send failed: {e}")
        return False

# ==================== Send Verification Email ====================
def send_verification_email(to_email: str, token: str) -> bool:
    link = f"{settings.FRONTEND_URL}/verify-and-set-password?token={token}"
    if getattr(settings, "ENVIRONMENT", "development") == "development":
        print(f"[DEV] Verification link for {to_email}: {link}")
        return True

    html = f"""
    <html>
      <body>
        <p>Welcome! to {settings.PROJECT_NAME}</p>
        <p>Please verify your email and set your password:</p>
        <p><a href="{link}">Verify & Set Password</a></p>
        <p>If you didn’t request this, ignore this email.</p>
      </body>
    </html>
    """
    return _send_email_smtp(to_email, "Verify your email", html)

# ==================== Send Reset Password Email ====================
def send_reset_password_email(to_email: str, token: str) -> bool:
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    if getattr(settings, "ENVIRONMENT", "development") == "development":
        print(f"[DEV] Password reset link for {to_email}: {link}")
        return True

    html = f"""
    <html>
      <body>
        <p>You requested a password reset for {settings.PROJECT_NAME}.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{link}">Reset Password</a></p>
        <p>If you didn’t request this, ignore this email.</p>
      </body>
    </html>
    """
    return _send_email_smtp(to_email, "Reset your password", html)