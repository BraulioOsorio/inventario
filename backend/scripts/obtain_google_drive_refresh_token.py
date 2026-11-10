"""
Uso único en tu PC para obtener GOOGLE_OAUTH_REFRESH_TOKEN.

1. En Google Cloud → Credenciales → Crear ID de cliente OAuth → Aplicación de escritorio.
2. Descarga el JSON y guárdalo como backend/client_secret_oauth.json (no subir a Git).
3. En Pantalla de consentimiento, agrega tu Gmail como usuario de prueba.
4. Ejecuta desde backend:
   .venv\\Scripts\\python scripts/obtain_google_drive_refresh_token.py
5. Copia el refresh_token a Render (GOOGLE_OAUTH_REFRESH_TOKEN).
"""
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/drive"]
SECRET = Path(__file__).resolve().parents[1] / "client_secret_oauth.json"


def main() -> None:
    if not SECRET.is_file():
        raise SystemExit(f"No existe {SECRET}. Descarga el JSON del cliente OAuth de escritorio.")
    flow = InstalledAppFlow.from_client_secrets_file(str(SECRET), SCOPES)
    creds = flow.run_local_server(port=0)
    print("\n--- Copia esto en Render (Environment) ---\n")
    print(f"GOOGLE_OAUTH_CLIENT_ID={creds.client_id}")
    print(f"GOOGLE_OAUTH_CLIENT_SECRET={creds.client_secret}")
    print(f"GOOGLE_OAUTH_REFRESH_TOKEN={creds.refresh_token}")
    print("\n-------------------------------------------\n")


if __name__ == "__main__":
    main()
