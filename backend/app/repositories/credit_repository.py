from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.models.entities import CreditAccount, CreditLine, CreditPayment


class CreditRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(self, owner_id: UUID, status: str | None = None) -> list[CreditAccount]:
        query = (
            self.db.query(CreditAccount)
            .options(
                joinedload(CreditAccount.customer),
                joinedload(CreditAccount.lines).joinedload(CreditLine.product),
            )
            .filter(CreditAccount.owner_id == owner_id)
        )
        if status:
            query = query.filter(CreditAccount.status == status)
        return query.order_by(CreditAccount.updated_at.desc()).all()

    def list_all_with_ledger(self, owner_id: UUID) -> list[CreditAccount]:
        return (
            self.db.query(CreditAccount)
            .options(
                joinedload(CreditAccount.lines),
                joinedload(CreditAccount.payments),
            )
            .filter(CreditAccount.owner_id == owner_id)
            .all()
        )

    def get_for_customer(self, owner_id: UUID, customer_id: UUID) -> CreditAccount | None:
        return (
            self.db.query(CreditAccount)
            .options(joinedload(CreditAccount.customer))
            .filter(CreditAccount.owner_id == owner_id, CreditAccount.customer_id == customer_id)
            .order_by(CreditAccount.updated_at.desc())
            .first()
        )

    def get_active_for_customer(self, owner_id: UUID, customer_id: UUID) -> CreditAccount | None:
        return (
            self.db.query(CreditAccount)
            .options(joinedload(CreditAccount.customer))
            .filter(
                CreditAccount.owner_id == owner_id,
                CreditAccount.customer_id == customer_id,
                CreditAccount.status == "activo",
            )
            .first()
        )

    def get(self, account_id: UUID, owner_id: UUID) -> CreditAccount | None:
        return (
            self.db.query(CreditAccount)
            .options(
                joinedload(CreditAccount.customer),
                joinedload(CreditAccount.lines).joinedload(CreditLine.product),
                joinedload(CreditAccount.payments).joinedload(CreditPayment.payment_method),
            )
            .filter(CreditAccount.id == account_id, CreditAccount.owner_id == owner_id)
            .first()
        )

    def create(self, owner_id: UUID, customer_id: UUID, **data) -> CreditAccount:
        account = CreditAccount(owner_id=owner_id, customer_id=customer_id, **data)
        self.db.add(account)
        self.db.flush()
        return account

    def add_line(self, account_id: UUID, **data) -> CreditLine:
        line = CreditLine(account_id=account_id, **data)
        self.db.add(line)
        self.db.flush()
        return line

    def add_payment(self, account_id: UUID, **data) -> CreditPayment:
        payment = CreditPayment(account_id=account_id, **data)
        self.db.add(payment)
        self.db.flush()
        return payment

    def get_line_by_movement(self, movement_id: UUID, owner_id: UUID) -> CreditLine | None:
        return (
            self.db.query(CreditLine)
            .join(CreditAccount, CreditLine.account_id == CreditAccount.id)
            .filter(CreditLine.movement_id == movement_id, CreditAccount.owner_id == owner_id)
            .first()
        )

    def find_legacy_line_for_movement(self, owner_id: UUID, movement) -> CreditLine | None:
        if not movement.note or not str(movement.note).startswith("Crédito ·"):
            return None
        from datetime import timedelta

        window_start = movement.created_at - timedelta(minutes=5)
        window_end = movement.created_at + timedelta(minutes=5)
        candidates = (
            self.db.query(CreditLine)
            .join(CreditAccount, CreditLine.account_id == CreditAccount.id)
            .filter(
                CreditAccount.owner_id == owner_id,
                CreditLine.product_id == movement.product_id,
                CreditLine.quantity == movement.quantity,
                CreditLine.movement_id.is_(None),
                CreditLine.created_at >= window_start,
                CreditLine.created_at <= window_end,
            )
            .all()
        )
        if len(candidates) == 1:
            return candidates[0]
        mov_total = None
        parts = str(movement.note).split("·")
        if len(parts) >= 3:
            raw = parts[-1].strip().replace(".", "").replace(",", ".")
            try:
                mov_total = float(raw)
            except ValueError:
                mov_total = None
        for line in candidates:
            if mov_total is not None and abs(float(line.line_total) - mov_total) < 0.02:
                return line
        return None

    def delete_line(self, line: CreditLine) -> None:
        self.db.delete(line)

    def get_payment(self, payment_id: UUID, owner_id: UUID) -> CreditPayment | None:
        return (
            self.db.query(CreditPayment)
            .join(CreditAccount, CreditPayment.account_id == CreditAccount.id)
            .options(joinedload(CreditPayment.payment_method))
            .filter(CreditPayment.id == payment_id, CreditAccount.owner_id == owner_id)
            .first()
        )
