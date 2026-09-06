from uuid import UUID
from sqlalchemy.orm import Session, joinedload

from app.models.entities import Loan


class LoanRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(
        self,
        owner_id: UUID,
        status: str | None = None,
        product_id: UUID | None = None,
    ) -> list[Loan]:
        query = (
            self.db.query(Loan)
            .options(joinedload(Loan.product), joinedload(Loan.customer))
            .filter(Loan.owner_id == owner_id)
        )
        if status:
            query = query.filter(Loan.status == status)
        if product_id:
            query = query.filter(Loan.product_id == product_id)
        return query.order_by(Loan.created_at.desc()).all()

    def get(self, loan_id: UUID, owner_id: UUID) -> Loan | None:
        return (
            self.db.query(Loan)
            .options(joinedload(Loan.product), joinedload(Loan.customer))
            .filter(Loan.id == loan_id, Loan.owner_id == owner_id)
            .first()
        )

    def create(self, owner_id: UUID, **data) -> Loan:
        loan = Loan(owner_id=owner_id, **data)
        self.db.add(loan)
        self.db.commit()
        self.db.refresh(loan)
        return loan

    def update(self, loan: Loan, **fields) -> Loan:
        for key, value in fields.items():
            if value is not None or key in {"borrower_contact", "due_date", "returned_date", "notes"}:
                setattr(loan, key, value)
        self.db.commit()
        self.db.refresh(loan)
        return loan

    def delete(self, loan: Loan) -> None:
        self.db.delete(loan)
        self.db.commit()
