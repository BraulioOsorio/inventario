from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import PaymentMethod

DEFAULT_METHOD_NAMES = ("Efectivo", "Transferencia")


class PaymentMethodRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(self, owner_id: UUID) -> list[PaymentMethod]:
        return (
            self.db.query(PaymentMethod)
            .filter(PaymentMethod.owner_id == owner_id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.name.asc())
            .all()
        )

    def get(self, method_id: UUID, owner_id: UUID) -> PaymentMethod | None:
        return (
            self.db.query(PaymentMethod)
            .filter(PaymentMethod.id == method_id, PaymentMethod.owner_id == owner_id)
            .first()
        )

    def get_by_name(self, owner_id: UUID, name: str) -> PaymentMethod | None:
        return (
            self.db.query(PaymentMethod)
            .filter(PaymentMethod.owner_id == owner_id, PaymentMethod.name == name)
            .first()
        )

    def create(self, owner_id: UUID, name: str, *, is_default: bool = False) -> PaymentMethod:
        method = PaymentMethod(owner_id=owner_id, name=name.strip(), is_default=is_default)
        self.db.add(method)
        self.db.flush()
        return method

    def delete(self, method: PaymentMethod) -> None:
        self.db.delete(method)

    def count_payments(self, method_id: UUID) -> int:
        from app.models.entities import CreditPayment

        return self.db.query(CreditPayment).filter(CreditPayment.payment_method_id == method_id).count()
