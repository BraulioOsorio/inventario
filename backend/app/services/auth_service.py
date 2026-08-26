from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import User
from app.repositories.user_repository import UserRepository
from app.schemas.dtos import (
    AdminUserCreate,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdateAdmin,
)


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def register(self, payload: UserCreate) -> TokenOut:
        if self.users.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")
        user = self.users.create(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            is_admin=False,
        )
        return self._token_response(user)

    def login(self, payload: UserLogin) -> TokenOut:
        user = self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
        return self._token_response(user)

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
