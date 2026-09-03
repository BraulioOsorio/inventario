import time

from sqlalchemy import text

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models import entities  # noqa: F401
from app.models.entities import User


def migrate_schema() -> None:
    """Asegura columnas nuevas en tablas ya existentes (Supabase)."""
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
                """
            )
        )
        conn.execute(text("ALTER TABLE products DROP CONSTRAINT IF EXISTS uq_product_owner_sku"))


def seed_admin() -> None:
    email = (settings.ADMIN_EMAIL or "braulioosoriomartinez@gmail.com").lower().strip()
    password = settings.ADMIN_PASSWORD
    full_name = settings.ADMIN_FULL_NAME or "Braulio Osorio Martinez"

    if not password:
        print("ADMIN_PASSWORD no definido: se omite el seed del administrador.")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                email=email,
                full_name=full_name,
                password_hash=hash_password(password),
                is_admin=True,
                is_active=True,
            )
            db.add(user)
            db.commit()
            print(f"Admin creado: {email}")
        else:
            user.is_admin = True
            user.is_active = True
            user.full_name = full_name
            user.password_hash = hash_password(password)
            db.commit()
            print(f"Admin actualizado: {email}")
    finally:
        db.close()


def init_db(retries: int = 8, delay_seconds: int = 5) -> None:
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            print(f"Conectando a Postgres (intento {attempt}/{retries})...")
            Base.metadata.create_all(bind=engine)
            migrate_schema()
            seed_admin()
            print("Tablas creadas / verificadas en Supabase Postgres.")
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"Fallo de conexión: {exc}")
            if attempt < retries:
                time.sleep(delay_seconds)

    print(
        "ERROR: no se pudo conectar a la base. "
        "En Render usa la URL del Connection Pooler de Supabase (IPv4), "
        "no el host db.xxx.supabase.co directo."
    )
    if last_error:
        raise last_error


if __name__ == "__main__":
    init_db()
