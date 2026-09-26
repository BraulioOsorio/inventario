from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.dtos import BusinessDayOpenRequest, BusinessDayStatusOut
from app.services.business_day_service import BusinessDayService

router = APIRouter()


def _client_date_header(x_client_date: str | None = Header(None, alias="X-Client-Date")) -> str:
    if not x_client_date:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encabezado X-Client-Date requerido (YYYY-MM-DD).",
        )
    return x_client_date


@router.get("/status", response_model=BusinessDayStatusOut)
def business_day_status(
    client_date: str = Depends(_client_date_header),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BusinessDayService(db).status(user, client_date)


@router.post("/open", response_model=BusinessDayStatusOut)
def open_business_day(
    payload: BusinessDayOpenRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BusinessDayService(db).open_day(user, payload)


@router.post("/close", response_model=BusinessDayStatusOut)
def close_business_day(
    client_date: str = Depends(_client_date_header),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BusinessDayService(db).close_day(user, client_date)


@router.post("/rollover", response_model=BusinessDayStatusOut)
def rollover_business_day(
    payload: BusinessDayOpenRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BusinessDayService(db).rollover_day(user, payload)
