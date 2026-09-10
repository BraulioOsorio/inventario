from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import send_password_reset_email
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    hash_password,
    verify_password,
    verify_password_reset_token,
)
from app.models.entities import User
from app.repositories.user_repository import UserRepository
from app.schemas.dtos import (
    AdminUserCreate,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    PasswordChange,
    ProfileUpdate,
    ResetPasswordRequest,
    SimpleMessageResponse,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdateAdmin,
)


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def request_access(self, payload: UserCreate) -> SimpleMessageResponse:
        existing = self.users.get_by_email(payload.email)
        if existing:
            if existing.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="El correo ya está registrado y activo",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una solicitud pendiente con este correo. Espera la activación del administrador.",
            )
        self.users.create(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            is_admin=False,
            is_active=False,
        )
        return SimpleMessageResponse(
            message=(
                "Solicitud enviada correctamente. Un administrador revisará tu cuenta "
                "y te activará para que puedas ingresar al sistema."
            )
        )

    def login(self, payload: UserLogin) -> TokenOut:
        user = self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta aún no ha sido activada. Contacta al administrador.",
            )
        return self._token_response(user)

    def forgot_password(self, payload: ForgotPasswordRequest) -> ForgotPasswordResponse:
        email = payload.email.lower().strip()
        user = self.users.get_by_email(email)
        if not user:
            # Respuesta genérica por seguridad
            return ForgotPasswordResponse(
                message="Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
                email_sent=False,
                reset_link=None,
            )

        token = create_password_reset_token(user.email)
        frontend_base = settings.FRONTEND_URL.rstrip("/")
        reset_url = f"{frontend_base}/recuperar-contrasena?token={token}"
        email_sent = send_password_reset_email(user.email, reset_url, user.full_name)

        return ForgotPasswordResponse(
            message="Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
            email_sent=email_sent,
        )

    def reset_password(self, payload: ResetPasswordRequest) -> SimpleMessageResponse:
        email = verify_password_reset_token(payload.token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El enlace de recuperación es inválido o ha expirado.",
            )

        user = self.users.get_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

        self.users.update(user, password_hash=hash_password(payload.new_password))
        return SimpleMessageResponse(
            message="Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
        )

    def list_users(self) -> list[UserOut]:
        return [UserOut.model_validate(u) for u in self.users.list_all()]

    def admin_create_user(self, payload: AdminUserCreate) -> UserOut:
        if self.users.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")
        user = self.users.create(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            is_admin=payload.is_admin,
            is_active=payload.is_active,
        )
        return UserOut.model_validate(user)

    def update_profile(self, user: User, payload: ProfileUpdate) -> UserOut:
        updated = self.users.update(user, full_name=payload.full_name.strip())
        return UserOut.model_validate(updated)

    def change_password(self, user: User, payload: PasswordChange) -> SimpleMessageResponse:
        if not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña actual no es correcta",
            )
        if verify_password(payload.new_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contraseña debe ser diferente a la actual",
            )
        self.users.update(user, password_hash=hash_password(payload.new_password))
        return SimpleMessageResponse(message="Contraseña actualizada correctamente.")

    def admin_update_user(self, user_id: UUID, payload: UserUpdateAdmin) -> UserOut:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        data = payload.model_dump(exclude_unset=True)
        if "password" in data:
            data["password_hash"] = hash_password(data.pop("password"))
        updated = self.users.update(user, **data)
        return UserOut.model_validate(updated)

    def _token_response(self, user: User) -> TokenOut:
        token = create_access_token(
            str(user.id),
            {"email": user.email, "is_admin": bool(user.is_admin)},
        )
        return TokenOut(access_token=token, user=UserOut.model_validate(user))
