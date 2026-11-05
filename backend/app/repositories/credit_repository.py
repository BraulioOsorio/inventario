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

    def get_payment(self, payment_id: UUID, owner_id: UUID) -> CreditPayment | None:
        return (
            self.db.query(CreditPayment)
            .join(CreditAccount, CreditPayment.account_id == CreditAccount.id)
            .options(joinedload(CreditPayment.payment_method))
            .filter(CreditPayment.id == payment_id, CreditAccount.owner_id == owner_id)
            .first()
        )
