from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import PaymentMethodCreate, PaymentMethodOut, PaymentMethodUpdate
from app.services.payment_method_service import PaymentMethodService

router = APIRouter()


@router.get("", response_model=list[PaymentMethodOut])
def list_payment_methods(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PaymentMethodService(db).list_methods(user)


@router.post("", response_model=PaymentMethodOut, status_code=201)
def create_payment_method(
    payload: PaymentMethodCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PaymentMethodService(db).create_method(user, payload)


@router.put("/{method_id}", response_model=PaymentMethodOut)
def update_payment_method(
    method_id: UUID,
    payload: PaymentMethodUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PaymentMethodService(db).update_method(user, method_id, payload)


@router.delete("/{method_id}", status_code=204)
def delete_payment_method(
    method_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PaymentMethodService(db).delete_method(user, method_id)
