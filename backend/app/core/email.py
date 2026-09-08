import json
import logging
import smtplib
import urllib.error
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_via_brevo_http(
    to_email: str,
    user_name: str,
    subject: str,
    html_content: str,
    plain_content: str,
    from_email: str,
) -> bool:
    """Envía el correo a través de la API REST de Brevo (HTTPS puerto 443, sin bloqueos de firewall)."""
    api_key = settings.BREVO_API_KEY.strip()
    if not api_key:
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    sender_email = from_email or settings.ADMIN_EMAIL or "no-reply@inventario.app"

    payload = {
        "sender": {"name": "Inventario Modular", "email": sender_email},
        "to": [{"email": to_email, "name": user_name}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": plain_content,
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "api-key": api_key,
                "Accept": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status in (200, 201, 202):
                logger.info(f"Correo de recuperación enviado con éxito a {to_email} vía Brevo API (HTTPS)")
                return True
            logger.warning(f"Respuesta inesperada de Brevo API: {response.status}")
            return False
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error(f"Error HTTP de Brevo API al enviar a {to_email} (código {exc.code}): {body}")
        return False
    except Exception as exc:
        logger.error(f"Error al conectar con Brevo API: {exc}")
        return False


def _send_via_resend_http(
    to_email: str,
    subject: str,
    html_content: str,
    plain_content: str,
    from_email: str,
) -> bool:
    """Envía el correo a través de la API REST de Resend (HTTPS puerto 443)."""
    api_key = settings.RESEND_API_KEY.strip()
    if not api_key:
        return False

    url = "https://api.resend.com/emails"
    # Resend en modo prueba permite onboarding@resend.dev si no hay dominio propio verificado
    sender = from_email if ("@" in from_email and "gmail" not in from_email.lower()) else "Inventario Modular <onboarding@resend.dev>"

    payload = {
        "from": sender,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": plain_content,
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status in (200, 201):
                logger.info(f"Correo de recuperación enviado con éxito a {to_email} vía Resend API (HTTPS)")
                return True
            logger.warning(f"Respuesta inesperada de Resend API: {response.status}")
            return False
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error(f"Error HTTP de Resend API al enviar a {to_email} (código {exc.code}): {body}")
        return False
    except Exception as exc:
        logger.error(f"Error al conectar con Resend API: {exc}")
        return False


def _send_via_smtp(
    to_email: str,
    subject: str,
    html_content: str,
    plain_content: str,
    from_email: str,
) -> bool:
    """Envía correo vía SMTP tradicional (puerto 587 o 465)."""
    smtp_host = (settings.SMTP_HOST or "").strip()
    smtp_user = (settings.SMTP_USER or "").strip()
    smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
    smtp_port = int(settings.SMTP_PORT or 587)

    if not smtp_host or not smtp_user:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    msg.attach(MIMEText(plain_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as server:
                if smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(from_email, [to_email], msg.as_string())

        logger.info(f"Correo de recuperación enviado con éxito a {to_email} vía SMTP")
        return True
    except OSError as exc:
        if exc.errno == 101 or "network is unreachable" in str(exc).lower():
            logger.error(
                f"[PUERTO SMTP BLOQUEADO EN RENDER FREE] Render en plan gratuito bloquea los puertos "
                f"SMTP salientes (25, 465, 587) para prevenir spam: {exc}. "
                f"SOLUCIÓN: Configura la variable BREVO_API_KEY o RESEND_API_KEY para enviar por HTTPS (puerto 443)."
            )
        else:
            logger.error(f"Error de red SMTP al enviar a {to_email}: {exc}")
        return False
    except Exception as exc:
        logger.error(f"Error SMTP al enviar correo a {to_email}: {exc}")
        return False


def send_password_reset_email(to_email: str, reset_url: str, user_name: str) -> bool:
    """
    Envía un correo con el enlace de recuperación de contraseña.
    Prioridad:
    1. Brevo REST API (HTTPS puerto 443 - recomendado para Render Free)
    2. Resend REST API (HTTPS puerto 443)
    3. SMTP tradicional (si Render es de pago o local)
    """
    subject = "Recuperación de contraseña — Inventario Modular"
    from_email = (settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "no-reply@inventario.app").strip()

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f6fa;
          margin: 0;
          padding: 24px;
          color: #1f2937;
        }}
        .card {{
          max-width: 540px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }}
        .header {{
          text-align: center;
          margin-bottom: 24px;
        }}
        .badge {{
          display: inline-block;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }}
        h1 {{
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 12px 0 8px;
        }}
        p {{
          font-size: 15px;
          line-height: 1.6;
          color: #4b5563;
        }}
        .btn-wrap {{
          text-align: center;
          margin: 28px 0;
        }}
        .btn {{
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
          padding: 12px 28px;
          border-radius: 10px;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
        }}
        .url-box {{
          background: #f9fafb;
          border: 1px dashed #d1d5db;
          padding: 12px;
          border-radius: 8px;
          word-break: break-all;
          font-size: 12px;
          color: #6b7280;
          margin-top: 20px;
        }}
        .footer {{
          margin-top: 32px;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
          border-top: 1px solid #f3f4f6;
          padding-top: 16px;
        }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <span class="badge">Inventario Modular</span>
          <h1>Recupera tu contraseña</h1>
        </div>
        <p>Hola, <strong>{user_name}</strong>:</p>
        <p>
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en
          <strong>Inventario Modular</strong>. Haz clic en el siguiente botón para continuar:
        </p>
        <div class="btn-wrap">
          <a href="{reset_url}" class="btn" target="_blank" rel="noopener noreferrer">
            Restablecer contraseña
          </a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">
          Este enlace tiene una validez de <strong>30 minutos</strong>. Si no solicitaste este cambio,
          puedes ignorar este mensaje; tu contraseña actual permanecerá segura.
        </p>
        <div class="url-box">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
          <a href="{reset_url}" style="color: #4f46e5;">{reset_url}</a>
        </div>
        <div class="footer">
          Sistema de Inventario Modular · Solicitud de seguridad
        </div>
      </div>
    </body>
    </html>
    """

    plain_content = f"""Hola, {user_name}:

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Inventario Modular.

Ingresa al siguiente enlace para restablecerla (válido por 30 minutos):
{reset_url}

Si no solicitaste este cambio, ignora este mensaje.
"""

    # Registro en logs de respaldo (así siempre podrás ver el enlace si lo necesitas consultar en consola)
    logger.info(f"[ENLACE DE RECUPERACIÓN GENERADO] para {to_email}: {reset_url}")

    # 1. Intentar Brevo HTTP API
    if settings.BREVO_API_KEY:
        if _send_via_brevo_http(to_email, user_name, subject, html_content, plain_content, from_email):
            return True

    # 2. Intentar Resend HTTP API
    if settings.RESEND_API_KEY:
        if _send_via_resend_http(to_email, subject, html_content, plain_content, from_email):
            return True

    # 3. Intentar SMTP tradicional
    if settings.SMTP_HOST and settings.SMTP_USER:
        if _send_via_smtp(to_email, subject, html_content, plain_content, from_email):
            return True

    logger.warning(
        f"[AVISO] No se pudo enviar el correo a {to_email}. "
        f"En Render Free debes configurar la variable BREVO_API_KEY o RESEND_API_KEY (HTTPS puerto 443)."
    )
    return False
