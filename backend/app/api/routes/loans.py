from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import LoanCreate, LoanOut, LoanReturnRequest, LoanUpdate
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("", response_model=list[LoanOut])
def list_loans(
    status: str | None = Query(default=None),
    product_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).list_loans(user, status=status, product_id=product_id)


@router.post("", response_model=LoanOut, status_code=201)
def create_loan(
    payload: LoanCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).create_loan(user, payload)


@router.put("/{loan_id}", response_model=LoanOut)
def update_loan(
    loan_id: UUID,
    payload: LoanUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).update_loan(user, loan_id, payload)


@router.post("/{loan_id}/return", response_model=LoanOut)
def return_loan(
    loan_id: UUID,
    payload: LoanReturnRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).return_loan(user, loan_id, payload)


@router.delete("/{loan_id}", status_code=204)
def delete_loan(
    loan_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    InventoryService(db).delete_loan(user, loan_id)
