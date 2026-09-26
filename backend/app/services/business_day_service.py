from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import User
from app.repositories.business_day_repository import BusinessDayRepository
from app.schemas.dtos import BusinessDayOpenRequest, BusinessDayOut, BusinessDayStatusOut


class BusinessDayService:
    def __init__(self, db: Session):
        self.days = BusinessDayRepository(db)

    @staticmethod
    def parse_client_date(value: str) -> date:
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fecha de cliente inválida (use YYYY-MM-DD).",
            )

    def status(self, user: User, client_date: str) -> BusinessDayStatusOut:
        today = self.parse_client_date(client_date)
        open_day = self.days.get_open(user.id)
        open_out = BusinessDayOut.model_validate(open_day) if open_day else None
        is_current = bool(open_day and open_day.business_date == today)

        suggestion = None
        if open_day is None:
            suggestion = "open"
        elif open_day.business_date != today:
            suggestion = "rollover"

        return BusinessDayStatusOut(
            client_date=today,
            open_day=open_out,
            is_current_day=is_current,
            can_operate=is_current,
            suggestion=suggestion,
        )

    def assert_can_operate(self, user: User, client_date: str) -> BusinessDayOut:
        st = self.status(user, client_date)
        if not st.open_day:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Debes abrir el día operativo antes de registrar movimientos.",
            )
        if not st.is_current_day:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El día abierto no coincide con la fecha actual. Cierra el día anterior y abre el de hoy.",
            )
        return st.open_day

    def open_day(self, user: User, payload: BusinessDayOpenRequest) -> BusinessDayStatusOut:
        today = self.parse_client_date(payload.client_date)
        existing = self.days.get_open(user.id)
        if existing:
            if existing.business_date == today:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya tienes el día de hoy abierto.",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tienes otro día abierto. Ciérralo antes de abrir uno nuevo.",
            )
        self.days.create_open(user.id, today)
        return self.status(user, payload.client_date)

    def close_day(self, user: User, client_date: str) -> BusinessDayStatusOut:
        open_day = self.days.get_open(user.id)
        if not open_day:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay un día operativo abierto.",
            )
        self.days.close(open_day)
        return self.status(user, client_date)

    def rollover_day(self, user: User, payload: BusinessDayOpenRequest) -> BusinessDayStatusOut:
        open_day = self.days.get_open(user.id)
        if open_day:
            self.days.close(open_day)
        today = self.parse_client_date(payload.client_date)
        self.days.create_open(user.id, today)
        return self.status(user, payload.client_date)
