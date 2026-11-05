from uuid import UUID

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import (
    CreditAccountOut,
    CreditAccountUpdate,
    CreditChargeCreate,
    CreditPaymentCreate,
    CreditSummaryOut,
    CreditPaymentUpdate,
)
from app.services.business_day_service import BusinessDayService
from app.services.credit_service import CreditService

router = APIRouter()


def _client_date_header(x_client_date: str | None = Header(None, alias="X-Client-Date")) -> str:
    if not x_client_date:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encabezado X-Client-Date requerido.",
        )
    return x_client_date


@router.get("/summary", response_model=CreditSummaryOut)
def credit_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CreditService(db).summary(user)


@router.get("", response_model=list[CreditAccountOut])
def list_credit_accounts(
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CreditService(db).list_accounts(user, status=status)


@router.post("/charge", response_model=CreditAccountOut, status_code=201)
def charge_credit(
    payload: CreditChargeCreate,
    client_date: str = Depends(_client_date_header),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BusinessDayService(db).assert_can_operate(user, client_date)
    return CreditService(db).charge(user, payload)


@router.get("/{account_id}", response_model=CreditAccountOut)
def get_credit_account(
    account_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CreditService(db).get_account(user, account_id)


@router.put("/{account_id}", response_model=CreditAccountOut)
def update_credit_account(
    account_id: UUID,
    payload: CreditAccountUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CreditService(db).update_account(user, account_id, payload)


@router.post("/{account_id}/payments", response_model=CreditAccountOut)
def pay_credit(
    account_id: UUID,
    payload: CreditPaymentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CreditService(db).register_payment(user, account_id, payload)


@router.put("/{account_id}/payments/{payment_id}", response_model=CreditAccountOut)
def update_credit_payment(
    account_id: UUID,
    payment_id: UUID,
    payload: CreditPaymentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CreditService(db).update_payment(user, account_id, payment_id, payload)
