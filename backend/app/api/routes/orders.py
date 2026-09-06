from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import SupplierOrderCreate, SupplierOrderOut, SupplierOrderUpdate
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("", response_model=list[SupplierOrderOut])
def list_orders(
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).list_orders(user, status=status, q=q)


@router.post("", response_model=SupplierOrderOut, status_code=201)
def create_order(
    payload: SupplierOrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).create_order(user, payload)


@router.put("/{order_id}", response_model=SupplierOrderOut)
def update_order(
    order_id: UUID,
    payload: SupplierOrderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).update_order(user, order_id, payload)


@router.delete("/{order_id}", status_code=204)
def delete_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    InventoryService(db).delete_order(user, order_id)
