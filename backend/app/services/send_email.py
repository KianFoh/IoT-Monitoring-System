from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
import logging
import smtplib
import re
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.user import User as UserModel
from app.models.department import Department
from app.models.customer import Customer
from app.models.distributor import Distributor

settings = get_settings()
SMTP_TIMEOUT_SECONDS = int(getattr(settings, "SMTP_TIMEOUT", 10))


def _smtp_from_header() -> str:
    return formataddr((settings.PROJECT_NAME, settings.SMTP_USER))

# ==================== SMTP Email Sending ====================
def _send_email_smtp(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = _smtp_from_header()
        msg["To"] = to_email
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if int(settings.SMTP_PORT) == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as server:
                server.ehlo()
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        return True
    except Exception:
        logging.exception("SMTP send failed")
        return False

def _normalize_subdomain(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9-]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or None


def _get_distributor_subdomain(db: Session, email: str) -> str | None:
    normalized_email = email.strip().lower()
    row = (
        db.query(Distributor.name)
        .select_from(UserModel)
        .join(Department, UserModel.department_id == Department.id)
        .join(Customer, Department.customer_id == Customer.id)
        .outerjoin(Distributor, Customer.distributor_id == Distributor.id)
        .filter(func.lower(UserModel.email) == normalized_email)
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

def _build_email_content(
    heading: str,
    intro_lines: list[str],
    cta_label: str,
    cta_link: str,
    outro_lines: list[str],
) -> tuple[str, str]:
    project = settings.PROJECT_NAME
    intro_text = "\n".join(intro_lines)
    outro_text = "\n".join(outro_lines)
    text = (
        f"{heading}\n\n"
        f"{intro_text}\n\n"
        f"{cta_label}: {cta_link}\n\n"
        f"{outro_text}\n\n"
        f"{project} Team"
    )
    intro_html = "".join(f"<p>{line}</p>" for line in intro_lines)
    outro_html = "".join(f"<p>{line}</p>" for line in outro_lines)
    html = f"""
    <html>
      <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:28px;">
                <tr>
                  <td style="color:#111827;">
                    <h2 style="margin:0 0 16px 0;font-size:20px;">{heading}</h2>
                    {intro_html}
                    <p style="margin:24px 0;">
                      <a href="{cta_link}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">
                        {cta_label}
                      </a>
                    </p>
                    <p style="font-size:12px;color:#6b7280;">If the button doesn't work, copy and paste this link:</p>
                    <p style="font-size:12px;color:#6b7280;word-break:break-all;">{cta_link}</p>
                    {outro_html}
                    <p style="margin-top:24px;">Regards,<br>{project} Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
    return text, html


# ==================== Send Verification Email ====================
def send_verification_email(db: Session, to_email: str, token: str) -> bool:
    if not token:
        return False
    base_url = _build_frontend_url(db, to_email)
    link = f"{base_url}/verify-email?token={token}"
    if getattr(settings, "ENVIRONMENT", "development") == "development":
        logging.info("[DEV] Verification link for %s: %s", to_email, link)
        return True

    text, html = _build_email_content(
        heading=f"Email Verification - {settings.PROJECT_NAME}",
        intro_lines=[
            "Dear User,",
            f"You have been invited to access {settings.PROJECT_NAME}.",
            "To activate your account, please verify your email address by clicking the link below:",
        ],
        cta_label="Verify Email",
        cta_link=link,
        outro_lines=[
            "If you did not expect this invitation, you can safely ignore this email.",
        ],
    )
    return _send_email_smtp(to_email, f"Email Verification - {settings.PROJECT_NAME}", text, html)

# ==================== Send Reset Password Email ====================
def send_reset_password_email(db: Session, to_email: str, token: str) -> bool:
    if not token:
        return False
    base_url = _build_frontend_url(db, to_email)
    link = f"{base_url}/reset-password?token={token}"
    if getattr(settings, "ENVIRONMENT", "development") == "development":
        logging.info("[DEV] Password reset link for %s: %s", to_email, link)
        return True

    text, html = _build_email_content(
        heading=f"Password Reset - {settings.PROJECT_NAME}",
        intro_lines=[
            "Dear User,",
            f"We received a request to reset the password for your {settings.PROJECT_NAME} account.",
            "Please click the link below to reset your password:",
        ],
        cta_label="Reset Password",
        cta_link=link,
        outro_lines=[
            "If you did not request this, you can safely ignore this email.",
        ],
    )
    return _send_email_smtp(to_email, f"Password Reset - {settings.PROJECT_NAME}", text, html)
