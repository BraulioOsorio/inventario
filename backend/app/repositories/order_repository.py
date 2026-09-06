from uuid import UUID
from sqlalchemy.orm import Session

from app.models.entities import SupplierOrder


class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(
        self,
        owner_id: UUID,
        status: str | None = None,
        q: str | None = None,
    ) -> list[SupplierOrder]:
        query = self.db.query(SupplierOrder).filter(SupplierOrder.owner_id == owner_id)
        if status:
            query = query.filter(SupplierOrder.status == status)
        if q:
            like = f"%{q.strip()}%"
            query = query.filter(
                (SupplierOrder.supplier_name.ilike(like))
                | (SupplierOrder.title.ilike(like))
                | (SupplierOrder.items_summary.ilike(like))
            )
        return query.order_by(SupplierOrder.expected_date.asc().nulls_last(), SupplierOrder.created_at.desc()).all()

    def get(self, order_id: UUID, owner_id: UUID) -> SupplierOrder | None:
        return (
            self.db.query(SupplierOrder)
            .filter(SupplierOrder.id == order_id, SupplierOrder.owner_id == owner_id)
            .first()
        )

    def create(self, owner_id: UUID, **data) -> SupplierOrder:
        order = SupplierOrder(owner_id=owner_id, **data)
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def update(self, order: SupplierOrder, **fields) -> SupplierOrder:
        for key, value in fields.items():
            if value is not None or key in {
                "supplier_contact",
                "items_summary",
                "expected_date",
                "monthly_day",
                "notes",
            }:
                setattr(order, key, value)
        self.db.commit()
        self.db.refresh(order)
        return order

    def delete(self, order: SupplierOrder) -> None:
        self.db.delete(order)
        self.db.commit()
