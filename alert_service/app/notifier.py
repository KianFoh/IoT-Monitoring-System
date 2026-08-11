import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from html import escape

from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal
from app.models import AlertContext

logger = logging.getLogger(__name__)

AlertRecipient = tuple[str, str | None]


def _smtp_from_header() -> str:
    return formataddr((settings.PROJECT_NAME, settings.SMTP_USER))


class NotificationService:
    def notify(self, context: AlertContext) -> None:
        method = context.rule.notification_method.lower()
        if method == "email":
            self._send_email(context)
            return

        logger.warning("Unsupported notification method: %s", context.rule.notification_method)

    def _send_email(self, context: AlertContext) -> None:
        recipients = self._get_department_recipients(context.rule.department_id)
        if not recipients:
            logger.warning(
                "No email recipients for alert rule_id=%s department_id=%s",
                context.rule.id,
                context.rule.department_id,
            )
            return

        alert_time = self._format_alert_time()
        subject = f"IoT System Alert: {context.rule.name} - {context.rule.device_name}"

        sent_count = 0
        for email, username in recipients:
            text_body = self._build_text_body(context, username, alert_time)
            html_body = self._build_html_body(text_body)
            if self._send_email_smtp(email, subject, text_body, html_body):
                sent_count += 1

        logger.info(
            "Email alert sent rule_id=%s device_uid=%s recipients=%s/%s",
            context.rule.id,
            context.rule.device_uid,
            sent_count,
            len(recipients),
        )

    def _get_department_recipients(self, department_id: int | None) -> list[AlertRecipient]:
        if department_id is None:
            return []

        with SessionLocal() as db:
            rows = db.execute(
                text(
                    """
                    SELECT DISTINCT u.email, u.username
                    FROM "user" u
                    LEFT JOIN user_department ud ON ud.user_id = u.id
                    WHERE (u.department_id = :department_id OR ud.department_id = :department_id)
                      AND u.is_active = TRUE
                      AND u.email IS NOT NULL
                    ORDER BY u.email
                    """
                ),
                {"department_id": department_id},
            )
            return [(row._mapping["email"], row._mapping["username"]) for row in rows]

    def _build_text_body(self, context: AlertContext, username: str | None = None, alert_time: str | None = None) -> str:
        message = context.rule.message or f"Alert rule triggered: {context.rule.name}"
        greeting_name = username.strip() if username else ""
        lines = [
            f"Dear {greeting_name or 'User'},",
            "",
            f"Alert Time: {alert_time or self._format_alert_time()}",
            f"Customer: {context.rule.customer_name or '-'}",
            f"Device Name: {context.rule.device_name}",
            f"Device UID: {context.rule.device_uid}",
            "",
            message,
        ]
        if context.rule.include_data_in_message:
            field_name = context.rule.field_label or context.rule.field
            lines.extend(["", "", f"{field_name}: {self._format_value(context.actual_value)}"])
        return "\n".join(lines)

    def _build_html_body(self, text_body: str) -> str:
        paragraphs = []
        for block in text_body.split("\n\n"):
            escaped = escape(block).replace("\n", "<br>")
            paragraphs.append(f"<p>{escaped}</p>")
        return f"""
        <html>
          <body style="font-family:Arial,sans-serif;color:#111827;">
            {''.join(paragraphs)}
          </body>
        </html>
        """

    def _format_value(self, value) -> str:
        if isinstance(value, list):
            return ", ".join(str(item) for item in value)
        return "" if value is None else str(value)

    def _format_alert_time(self) -> str:
        alert_time = datetime.now(timezone(timedelta(hours=8)))
        return f"{alert_time:%Y-%m-%d} {alert_time.strftime('%I:%M:%S %p').lstrip('0')} (UTC+8)"

    def _send_email_smtp(self, to_email: str, subject: str, text_body: str, html_body: str) -> bool:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = _smtp_from_header()
            msg["To"] = to_email
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            if int(settings.SMTP_PORT) == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            else:
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT) as server:
                    server.ehlo()
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
            return True
        except Exception:
            logger.exception("SMTP alert send failed to %s", to_email)
            return False
