from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import MovementCreate, MovementOut
from app.services.business_day_service import BusinessDayService
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("", response_model=list[MovementOut])
def list_movements(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return InventoryService(db).list_movements(user)


@router.post("", response_model=MovementOut, status_code=201)
def create_movement(
    payload: MovementCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_client_date: str | None = Header(None, alias="X-Client-Date"),
):
    if not x_client_date:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encabezado X-Client-Date requerido para movimientos.",
        )
    BusinessDayService(db).assert_can_operate(user, x_client_date)
    return InventoryService(db).register_movement(user, payload)
