from app.models.entities import User
from app.schemas.dtos import UserOut
from app.services.image_storage import user_has_avatar


def user_to_out(user: User) -> UserOut:
    stored_on_drive = bool(user.avatar_drive_file_id)
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=user.is_admin,
        is_active=user.is_active,
        avatar_base64=None if stored_on_drive else user.avatar_base64,
        has_avatar=user_has_avatar(user),
        created_at=user.created_at,
    )
