"""Persistencia de imágenes: Drive si está configurado; si no, solo Postgres."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Product, User
from app.services import drive_service


def product_has_image(product: Product) -> bool:
    if product.image_drive_file_id:
        return True
    raw = product.image_base64
    return bool(raw and str(raw).strip())


def user_has_avatar(user: User) -> bool:
    if user.avatar_drive_file_id:
        return True
    raw = user.avatar_base64
    return bool(raw and str(raw).strip())


def apply_product_image(
    db: Session,
    product: Product,
    owner_id: UUID,
    image_base64: str | None,
    *,
    clear_only: bool = False,
) -> None:
    if clear_only or image_base64 is None:
        drive_service.delete_file(product.image_drive_file_id)
        product.image_drive_file_id = None
        product.image_base64 = None
        db.commit()
        db.refresh(product)
        return

    if drive_service.drive_enabled():
        drive_service.delete_file(product.image_drive_file_id)
        file_id = drive_service.upload_product_image(owner_id, product.id, image_base64)
        product.image_drive_file_id = file_id
        product.image_base64 = None
    else:
        product.image_base64 = image_base64
    db.commit()
    db.refresh(product)


def apply_user_avatar(db: Session, user: User, avatar_base64: str | None) -> User:
    if avatar_base64 is None:
        drive_service.delete_file(user.avatar_drive_file_id)
        user.avatar_drive_file_id = None
        user.avatar_base64 = None
    elif drive_service.drive_enabled():
        drive_service.delete_file(user.avatar_drive_file_id)
        file_id = drive_service.upload_avatar_image(user.id, avatar_base64)
        user.avatar_drive_file_id = file_id
        user.avatar_base64 = None
    else:
        user.avatar_base64 = avatar_base64
    db.commit()
    db.refresh(user)
    return user


def read_product_image_bytes(product: Product) -> tuple[bytes, str] | None:
    if product.image_drive_file_id and drive_service.drive_enabled():
        try:
            return drive_service.download_file(product.image_drive_file_id)
        except Exception:
            return None
    if product.image_base64 and str(product.image_base64).strip():
        try:
            return drive_service.decode_inline_base64(product.image_base64)
        except Exception:
            return None
    return None


def read_user_avatar_bytes(user: User) -> tuple[bytes, str] | None:
    if user.avatar_drive_file_id and drive_service.drive_enabled():
        try:
            return drive_service.download_file(user.avatar_drive_file_id)
        except Exception:
            return None
    if user.avatar_base64 and str(user.avatar_base64).strip():
        try:
            return drive_service.decode_inline_base64(user.avatar_base64)
        except Exception:
            return None
    return None
