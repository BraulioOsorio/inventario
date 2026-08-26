from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import MovementCreate, MovementOut
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
):
    return InventoryService(db).register_movement(user, payload)
