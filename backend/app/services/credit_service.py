from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import User
from app.repositories.credit_repository import CreditRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.product_repository import MovementRepository, ProductRepository
from app.schemas.dtos import (
    CreditAccountOut,
    CreditChargeCreate,
    CreditLineOut,
    CreditPaymentCreate,
    CreditPaymentOut,
)


class CreditService:
    def __init__(self, db: Session):
        self.db = db
        self.credits = CreditRepository(db)
        self.customers = CustomerRepository(db)
        self.products = ProductRepository(db)
        self.movements = MovementRepository(db)

    def _to_out(self, account, now: datetime, include_details: bool = False) -> CreditAccountOut:
        out = CreditAccountOut.model_validate(account)
        if account.customer:
            out.customer_name = account.customer.full_name
            out.customer_phone = account.customer.phone
        out.lines_count = len(account.lines or [])
        if account.lines:
            parts = []
            for line in account.lines[:5]:
                name = line.product.name if line.product else "Producto"
                parts.append(f"{name} x{line.quantity}")
            summary = ", ".join(parts)
            if len(account.lines) > 5:
                summary += f" (+{len(account.lines) - 5} más)"
            out.items_summary = summary
        if account.status == "activo" and account.due_date:
            out.is_overdue = account.due_date.date() < now.date()
        if include_details:
            out.lines = [
                CreditLineOut(
                    id=line.id,
                    product_id=line.product_id,
                    product_name=line.product.name if line.product else None,
                    quantity=line.quantity,
                    unit_price=float(line.unit_price),
                    line_total=float(line.line_total),
                    created_at=line.created_at,
                )
                for line in sorted(account.lines or [], key=lambda x: x.created_at, reverse=True)
            ]
            out.payments = [
                CreditPaymentOut(
                    id=p.id,
                    amount=float(p.amount),
                    notes=p.notes,
                    created_at=p.created_at,
                )
                for p in sorted(account.payments or [], key=lambda x: x.created_at, reverse=True)
            ]
        return out

    def list_accounts(self, user: User, status: str | None = None) -> list[CreditAccountOut]:
        now = datetime.now(timezone.utc)
        accounts = self.credits.list_by_owner(user.id, status=status)
        return [self._to_out(a, now) for a in accounts]

    def get_account(self, user: User, account_id: UUID) -> CreditAccountOut:
        account = self.credits.get(account_id, user.id)
        if not account:
            raise HTTPException(status_code=404, detail="Cuenta de crédito no encontrada")
        now = datetime.now(timezone.utc)
        return self._to_out(account, now, include_details=True)

    def charge(self, user: User, payload: CreditChargeCreate) -> CreditAccountOut:
        customer = self.customers.get(payload.customer_id, user.id)
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        if not customer.is_active:
            raise HTTPException(status_code=400, detail="El cliente está inactivo")

        account = self.credits.get_active_for_customer(user.id, customer.id)
        if not account:
            recent = self.credits.get_for_customer(user.id, customer.id)
            if recent and recent.status == "saldado" and float(recent.balance_due) <= 0:
                account = recent
                account.status = "activo"
            else:
                account = self.credits.create(
                    user.id,
                    customer.id,
                    balance_due=0,
                    status="activo",
                    notes=payload.notes,
                )
        elif payload.notes:
            account.notes = payload.notes

        if payload.due_date:
            account.due_date = payload.due_date

        charge_total = 0.0
        customer_label = customer.full_name

        for item in payload.lines:
            product = self.products.get(item.product_id, user.id)
            if not product:
                raise HTTPException(status_code=404, detail="Producto no encontrado en la canasta")
            if not product.is_active:
                raise HTTPException(status_code=400, detail=f'"{product.name}" está inactivo')
            if product.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f'Stock insuficiente para "{product.name}" ({product.quantity} disponibles)',
                )

            unit_price = float(product.unit_price or 0)
            line_total = round(unit_price * item.quantity, 2)
            charge_total += line_total

            stock_before = product.quantity
            product.quantity -= item.quantity
            self.db.add(product)
            self.movements.create(
                owner_id=user.id,
                product_id=product.id,
                movement_type="out",
                quantity=item.quantity,
                note=f"Crédito · {customer_label} · {line_total:,.0f}",
                stock_before=stock_before,
            )
            self.credits.add_line(
                account.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=unit_price,
                line_total=line_total,
            )

        account.balance_due = round(float(account.balance_due) + charge_total, 2)
        account.status = "activo"
        self.db.commit()
        refreshed = self.credits.get(account.id, user.id)
        now = datetime.now(timezone.utc)
        return self._to_out(refreshed, now, include_details=True)

    def register_payment(self, user: User, account_id: UUID, payload: CreditPaymentCreate) -> CreditAccountOut:
        account = self.credits.get(account_id, user.id)
        if not account:
            raise HTTPException(status_code=404, detail="Cuenta de crédito no encontrada")
        if account.status == "saldado" and float(account.balance_due) <= 0:
            raise HTTPException(status_code=400, detail="Esta cuenta ya está saldada")

        amount = round(float(payload.amount), 2)
        balance = float(account.balance_due)
        if amount > balance + 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"El abono supera la deuda (${balance:,.0f} pendientes)",
            )

        self.credits.add_payment(account.id, amount=amount, notes=payload.notes)
        account.balance_due = round(max(0, balance - amount), 2)
        if account.balance_due <= 0:
            account.status = "saldado"
            account.balance_due = 0

        self.db.commit()
        refreshed = self.credits.get(account.id, user.id)
        now = datetime.now(timezone.utc)
        return self._to_out(refreshed, now, include_details=True)
