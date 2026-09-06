from uuid import UUID
from sqlalchemy.orm import Session

from app.models.entities import Customer


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(self, owner_id: UUID, q: str | None = None) -> list[Customer]:
        query = self.db.query(Customer).filter(Customer.owner_id == owner_id, Customer.is_active.is_(True))
        if q:
            like = f"%{q.strip()}%"
            query = query.filter(
                (Customer.full_name.ilike(like))
                | (Customer.document_id.ilike(like))
                | (Customer.phone.ilike(like))
                | (Customer.email.ilike(like))
            )
        return query.order_by(Customer.full_name.asc()).all()

    def get(self, customer_id: UUID, owner_id: UUID) -> Customer | None:
        return (
            self.db.query(Customer)
            .filter(Customer.id == customer_id, Customer.owner_id == owner_id)
            .first()
        )

    def create(self, owner_id: UUID, **data) -> Customer:
        customer = Customer(owner_id=owner_id, **data)
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def update(self, customer: Customer, **fields) -> Customer:
        for key, value in fields.items():
            if value is not None or key in {"document_id", "email", "phone", "address", "notes"}:
                setattr(customer, key, value)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def soft_delete(self, customer: Customer) -> None:
        customer.is_active = False
        self.db.commit()
