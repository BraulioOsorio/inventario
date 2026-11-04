from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import MovementCreate, MovementOut, MovementPageOut
from app.services.business_day_service import BusinessDayService
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("", response_model=MovementPageOut)
def list_movements(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).list_movements(user, page=page, page_size=page_size)


@router.post("", response_model=MovementOut, status_code=201)
def create_movement(
    payload: MovementCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_client_date: str | None = Header(None, alias="X-Client-Date"),
):
    if not x_client_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encabezado X-Client-Date requerido para movimientos.",
        )
    BusinessDayService(db).assert_can_operate(user, x_client_date)
    return InventoryService(db).register_movement(user, payload)


@router.post("/{movement_id}/revert", response_model=MovementOut)
def revert_movement(
    movement_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_client_date: str | None = Header(None, alias="X-Client-Date"),
):
    if not x_client_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encabezado X-Client-Date requerido para movimientos.",
        )
    BusinessDayService(db).assert_can_operate(user, x_client_date)
    return InventoryService(db).revert_movement(user, movement_id)
