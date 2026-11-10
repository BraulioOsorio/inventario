"""Migra imágenes legacy (base64 en Postgres) hacia Drive por lotes."""
from __future__ import annotations

from sqlalchemy import or_

from app.db.session import SessionLocal
from app.models.entities import Product, User
from app.services import drive_service
from app.services.image_storage import apply_product_image, apply_user_avatar

BATCH_LIMIT = 40


def migrate_legacy_images_batch() -> None:
    if not drive_service.drive_enabled():
        return

    db = SessionLocal()
    try:
        products = (
            db.query(Product)
            .filter(
                Product.image_base64.isnot(None),
                Product.image_base64 != "",
                or_(Product.image_drive_file_id.is_(None), Product.image_drive_file_id == ""),
            )
            .limit(BATCH_LIMIT)
            .all()
        )
        for product in products:
            b64 = product.image_base64
            if not b64:
                continue
            try:
                apply_product_image(db, product, product.owner_id, b64)
            except Exception as exc:  # noqa: BLE001
                print(f"Migración producto {product.id} omitida: {exc}")

        users = (
            db.query(User)
            .filter(
                User.avatar_base64.isnot(None),
                User.avatar_base64 != "",
                or_(User.avatar_drive_file_id.is_(None), User.avatar_drive_file_id == ""),
            )
            .limit(10)
            .all()
        )
        for user in users:
            b64 = user.avatar_base64
            if not b64:
                continue
            try:
                apply_user_avatar(db, user, b64)
            except Exception as exc:  # noqa: BLE001
                print(f"Migración avatar {user.id} omitida: {exc}")

        if products or users:
            print(f"Migración Drive: {len(products)} productos, {len(users)} avatares procesados.")
    finally:
        db.close()
