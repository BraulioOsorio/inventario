from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import BusinessDay


class BusinessDayRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_open(self, owner_id: UUID) -> BusinessDay | None:
        return (
            self.db.query(BusinessDay)
            .filter(BusinessDay.owner_id == owner_id, BusinessDay.closed_at.is_(None))
            .order_by(BusinessDay.opened_at.desc())
            .first()
        )

    def create_open(self, owner_id: UUID, business_date: date) -> BusinessDay:
        row = BusinessDay(owner_id=owner_id, business_date=business_date)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def close(self, day: BusinessDay) -> BusinessDay:
        from datetime import datetime, timezone

        day.closed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(day)
        return day
