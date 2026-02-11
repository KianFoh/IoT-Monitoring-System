from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import re
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.user import User as UserModel
from app.models.department import Department
from app.models.customer import Customer
from app.models.distributor import Distributor

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

def _normalize_subdomain(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or None


def _get_distributor_subdomain(db: Session, email: str) -> str | None:
    row = (
        db.query(Distributor.name)
        .select_from(UserModel)
        .join(Department, UserModel.department_id == Department.id)
        .join(Customer, Department.customer_id == Customer.id)
        .outerjoin(Distributor, Customer.distributor_id == Distributor.id)
        .filter(UserModel.email == email)
        .first()
    )
    distributor_name = row[0] if row else None
    return _normalize_subdomain(distributor_name)


def _get_frontend_base() -> str | None:
    return getattr(settings, "FRONTEND_BASE_DOMAIN", None) or None


def _build_frontend_url(db: Session, email: str) -> str:
    base_domain = _get_frontend_base()
    if not base_domain:
        raise RuntimeError("FRONTEND_BASE_DOMAIN is not configured.")

    distributor_sub = _get_distributor_subdomain(db, email)
    default_sub = getattr(settings, "FRONTEND_DEFAULT_SUBDOMAIN", "manage")
    subdomain = distributor_sub or _normalize_subdomain(default_sub)

    scheme = "https"
    if subdomain:
        return f"{scheme}://{subdomain}.{base_domain}"
    return f"{scheme}://{base_domain}"


# ==================== Send Verification Email ====================
def send_verification_email(db: Session, to_email: str, token: str) -> bool:
    if not token:
        return False
    base_url = _build_frontend_url(db, to_email)
    link = f"{base_url}/verify-email?token={token}"
    if getattr(settings, "ENVIRONMENT", "development") == "development":
        print(f"[DEV] Verification link for {to_email}: {link}")
        return True

    html = f"""
    <html>
      <body>
        <p>Welcome! to {settings.PROJECT_NAME}</p>
        <p>Please verify your email and set your password:</p>
        <p><a href="{link}">Verify Email</a></p>
        <p>If you didn’t request this, ignore this email.</p>
      </body>
    </html>
    """
    return _send_email_smtp(to_email, "Verify your email", html)

# ==================== Send Reset Password Email ====================
def send_reset_password_email(db: Session, to_email: str, token: str) -> bool:
    if not token:
        return False
    base_url = _build_frontend_url(db, to_email)
    link = f"{base_url}/reset-password?token={token}"
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
