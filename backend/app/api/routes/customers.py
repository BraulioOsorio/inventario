from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import CustomerCreate, CustomerOut, CustomerUpdate
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("", response_model=list[CustomerOut])
def list_customers(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).list_customers(user, q=q)


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).create_customer(user, payload)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: UUID,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).update_customer(user, customer_id, payload)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    InventoryService(db).delete_customer(user, customer_id)
