from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import User
from app.repositories.payment_method_repository import DEFAULT_METHOD_NAMES, PaymentMethodRepository
from app.schemas.dtos import PaymentMethodCreate, PaymentMethodOut, PaymentMethodUpdate


class PaymentMethodService:
    def __init__(self, db: Session):
        self.db = db
        self.methods = PaymentMethodRepository(db)

    def ensure_defaults(self, user: User) -> None:
        existing = {m.name for m in self.methods.list_by_owner(user.id)}
        for name in DEFAULT_METHOD_NAMES:
            if name not in existing:
                self.methods.create(user.id, name, is_default=True)
        self.db.commit()

    def list_methods(self, user: User) -> list[PaymentMethodOut]:
        self.ensure_defaults(user)
        return [PaymentMethodOut.model_validate(m) for m in self.methods.list_by_owner(user.id)]

    def create_method(self, user: User, payload: PaymentMethodCreate) -> PaymentMethodOut:
        self.ensure_defaults(user)
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre es obligatorio")
        if self.methods.get_by_name(user.id, name):
            raise HTTPException(status_code=409, detail="Ya existe una forma de pago con ese nombre")
        method = self.methods.create(user.id, name, is_default=False)
        self.db.commit()
        self.db.refresh(method)
        return PaymentMethodOut.model_validate(method)

    def update_method(self, user: User, method_id: UUID, payload: PaymentMethodUpdate) -> PaymentMethodOut:
        method = self.methods.get(method_id, user.id)
        if not method:
            raise HTTPException(status_code=404, detail="Forma de pago no encontrada")
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre es obligatorio")
        other = self.methods.get_by_name(user.id, name)
        if other and other.id != method.id:
            raise HTTPException(status_code=409, detail="Ya existe una forma de pago con ese nombre")
        method.name = name
        self.db.commit()
        self.db.refresh(method)
        return PaymentMethodOut.model_validate(method)

    def delete_method(self, user: User, method_id: UUID) -> None:
        method = self.methods.get(method_id, user.id)
        if not method:
            raise HTTPException(status_code=404, detail="Forma de pago no encontrada")
        if method.is_default:
            raise HTTPException(
                status_code=400,
                detail="No puedes eliminar las formas de pago base (Efectivo y Transferencia).",
            )
        if self.methods.count_payments(method.id) > 0:
            raise HTTPException(
                status_code=400,
                detail="Esta forma de pago tiene abonos registrados y no se puede eliminar.",
            )
        self.methods.delete(method)
        self.db.commit()
