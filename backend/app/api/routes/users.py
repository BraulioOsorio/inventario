from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import AdminUserCreate, UserOut, UserUpdateAdmin
from app.services.auth_service import AuthService

router = APIRouter()


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return AuthService(db).list_users()


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return AuthService(db).admin_create_user(payload)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: UUID,
    payload: UserUpdateAdmin,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return AuthService(db).admin_update_user(user_id, payload)
