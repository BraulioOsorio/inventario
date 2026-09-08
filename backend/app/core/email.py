import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_url: str, user_name: str) -> bool:
    """
    Envía un correo con el enlace de recuperación de contraseña si SMTP está configurado.
    Si no está configurado o falla, registra el evento en logs y retorna False.
    """
    subject = "Recuperación de contraseña — Inventario Modular"
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "no-reply@inventario.app"

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

    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(
            f"[SMTP NO CONFIGURADO] Faltan variables SMTP_HOST y SMTP_USER en el entorno de Render. "
            f"No se pudo enviar el correo a {to_email}. Enlace de recuperación: {reset_url}"
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email

        msg.attach(MIMEText(plain_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_email, [to_email], msg.as_string())

        logger.info(f"Correo de recuperación enviado con éxito a {to_email}")
        return True
    except Exception as exc:
        logger.error(f"Error al enviar correo de recuperación a {to_email}: {exc}")
        return False
