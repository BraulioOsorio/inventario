from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import NotificationsSummary
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("", response_model=NotificationsSummary)
def get_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return InventoryService(db).get_notifications(user)
