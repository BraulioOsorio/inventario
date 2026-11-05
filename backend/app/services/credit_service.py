from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import User
from app.repositories.credit_repository import CreditRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.services.payment_method_service import PaymentMethodService
from app.repositories.customer_repository import CustomerRepository
from app.repositories.product_repository import MovementRepository, ProductRepository
from app.schemas.dtos import (
    CreditAccountOut,
    CreditAccountUpdate,
    CreditChargeCreate,
    CreditLineOut,
    CreditPaymentCreate,
    CreditPaymentOut,
    CreditPaymentUpdate,
    CreditSummaryOut,
)


class CreditService:
    def __init__(self, db: Session):
        self.db = db
        self.credits = CreditRepository(db)
        self.customers = CustomerRepository(db)
        self.products = ProductRepository(db)
        self.movements = MovementRepository(db)
        self.payment_methods = PaymentMethodRepository(db)

    @staticmethod
    def _ledger_balance(account) -> float:
        charged = round(sum(float(line.line_total) for line in account.lines or []), 2)
        paid = round(sum(float(payment.amount) for payment in account.payments or []), 2)
        if paid > charged + 0.01:
            return 0.0
        return round(max(0.0, charged - paid), 2)

    @staticmethod
    def _recalc_account_balance(account, *, strict: bool = True) -> None:
        charged = round(sum(float(line.line_total) for line in account.lines or []), 2)
        paid = round(sum(float(payment.amount) for payment in account.payments or []), 2)
        if paid > charged + 0.01:
            if strict:
                raise HTTPException(
                    status_code=400,
                    detail=f"La suma de abonos (${paid:,.0f}) supera el total fiado (${charged:,.0f})",
                )
            account.balance_due = 0
            account.status = "saldado"
            return
        account.balance_due = round(max(0, charged - paid), 2)
        if account.balance_due <= 0:
            account.status = "saldado"
            account.balance_due = 0
        else:
            account.status = "activo"

    def _sync_all_balances(self, owner_id: UUID) -> None:
        accounts = self.credits.list_all_with_ledger(owner_id)
        for account in accounts:
            self._recalc_account_balance(account, strict=False)
        self.db.commit()
        self.db.expire_all()

    def _resolve_payment_method(self, user: User, method_id: UUID):
        method = self.payment_methods.get(method_id, user.id)
        if not method:
            PaymentMethodService(self.db).ensure_defaults(user)
            method = self.payment_methods.get(method_id, user.id)
        if not method:
            raise HTTPException(status_code=400, detail="Forma de pago no válida")
        return method

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
                    payment_method_id=p.payment_method_id,
                    payment_method_name=p.payment_method.name if p.payment_method else None,
                    notes=p.notes,
                    created_at=p.created_at,
                )
                for p in sorted(account.payments or [], key=lambda x: x.created_at, reverse=True)
            ]
        return out

    def list_accounts(self, user: User, status: str | None = None) -> list[CreditAccountOut]:
        self._sync_all_balances(user.id)
        now = datetime.now(timezone.utc)
        ledger_accounts = {a.id: a for a in self.credits.list_all_with_ledger(user.id)}
        accounts = self.credits.list_by_owner(user.id, status=status)
        results: list[CreditAccountOut] = []
        for account in accounts:
            out = self._to_out(account, now)
            ledger = ledger_accounts.get(account.id)
            if ledger:
                bal = self._ledger_balance(ledger)
                out.balance_due = bal
                out.status = "saldado" if bal <= 0.009 else "activo"
                if out.status == "activo" and account.due_date:
                    out.is_overdue = account.due_date.date() < now.date()
                else:
                    out.is_overdue = False
            results.append(out)
        return results

    def summary(self, user: User) -> CreditSummaryOut:
        self._sync_all_balances(user.id)
        now = datetime.now(timezone.utc)
        accounts = self.credits.list_all_with_ledger(user.id)
        total = 0.0
        active_count = 0
        overdue = 0
        for account in accounts:
            bal = self._ledger_balance(account)
            if bal <= 0.009:
                continue
            active_count += 1
            total += bal
            if account.due_date and account.due_date.date() < now.date():
                overdue += 1
        return CreditSummaryOut(
            active_count=active_count,
            total_debt=round(total, 2),
            overdue_count=overdue,
        )

    def update_account(self, user: User, account_id: UUID, payload: CreditAccountUpdate) -> CreditAccountOut:
        account = self.credits.get(account_id, user.id)
        if not account:
            raise HTTPException(status_code=404, detail="Cuenta de crédito no encontrada")
        data = payload.model_dump(exclude_unset=True)
        if "notes" in data:
            account.notes = data["notes"]
        if "due_date" in data:
            account.due_date = data["due_date"]
        self.db.commit()
        now = datetime.now(timezone.utc)
        refreshed = self.credits.get(account.id, user.id)
        return self._to_out(refreshed, now, include_details=True)

    @staticmethod
    def _append_note(existing: str | None, new_note: str) -> str:
        text = new_note.strip()
        if not text:
            return existing or ""
        if not existing or not existing.strip():
            return text
        if text in existing:
            return existing
        return f"{existing.strip()}\n{text}"

    def get_account(self, user: User, account_id: UUID) -> CreditAccountOut:
        account = self.credits.get(account_id, user.id)
        if not account:
            raise HTTPException(status_code=404, detail="Cuenta de crédito no encontrada")
        self._recalc_account_balance(account, strict=False)
        self.db.commit()
        account = self.credits.get(account_id, user.id)
        now = datetime.now(timezone.utc)
        out = self._to_out(account, now, include_details=True)
        bal = self._ledger_balance(account)
        out.balance_due = bal
        out.status = "saldado" if bal <= 0.009 else "activo"
        out.is_overdue = bool(out.status == "activo" and account.due_date and account.due_date.date() < now.date())
        return out

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
            account.notes = self._append_note(account.notes, payload.notes)

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
            mov = self.movements.create(
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
                movement_id=mov.id,
            )

        account.balance_due = round(float(account.balance_due) + charge_total, 2)
        account.status = "activo"
        self.db.commit()
        refreshed = self.credits.get(account.id, user.id)
        self._recalc_account_balance(refreshed)
        self.db.commit()
        refreshed = self.credits.get(account.id, user.id)
        now = datetime.now(timezone.utc)
        return self._to_out(refreshed, now, include_details=True)

    def revert_line_for_movement(self, user: User, movement) -> bool:
        """Elimina la línea de crédito ligada al movimiento. Devuelve True si aplicó."""
        line = self.credits.get_line_by_movement(movement.id, user.id)
        if not line:
            line = self.credits.find_legacy_line_for_movement(user.id, movement)
            if line:
                line.movement_id = movement.id
        if not line:
            return False

        account = self.credits.get(line.account_id, user.id)
        if not account:
            return False

        charged = round(sum(float(ln.line_total) for ln in account.lines or []), 2)
        paid = round(sum(float(p.amount) for p in account.payments or []), 2)
        charged_after = round(charged - float(line.line_total), 2)
        if paid > charged_after + 0.01:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No se puede revertir este crédito: ya hay abonos registrados que superan "
                    "la deuda si se quita este producto fiado. Ajusta o elimina abonos en Créditos."
                ),
            )

        self.credits.delete_line(line)
        self.db.flush()
        refreshed = self.credits.get(account.id, user.id)
        self._recalc_account_balance(refreshed, strict=False)
        return True

    def register_payment(self, user: User, account_id: UUID, payload: CreditPaymentCreate) -> CreditAccountOut:
        account = self.credits.get(account_id, user.id)
        if not account:
            raise HTTPException(status_code=404, detail="Cuenta de crédito no encontrada")
        if account.status == "saldado" and float(account.balance_due) <= 0:
            raise HTTPException(status_code=400, detail="Esta cuenta ya está saldada")

        amount = round(float(payload.amount), 2)
        balance = self._ledger_balance(account)
        if amount > balance + 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"El abono supera la deuda (${balance:,.0f} pendientes)",
            )

        method = self._resolve_payment_method(user, payload.payment_method_id)

        self.credits.add_payment(
            account.id,
            amount=amount,
            notes=payload.notes,
            payment_method_id=method.id,
        )
        refreshed = self.credits.get(account.id, user.id)
        self._recalc_account_balance(refreshed)
        self.db.commit()
        self._sync_all_balances(user.id)
        refreshed = self.credits.get(account.id, user.id)
        now = datetime.now(timezone.utc)
        return self._to_out(refreshed, now, include_details=True)

    def update_payment(
        self,
        user: User,
        account_id: UUID,
        payment_id: UUID,
        payload: CreditPaymentUpdate,
    ) -> CreditAccountOut:
        account = self.credits.get(account_id, user.id)
        if not account:
            raise HTTPException(status_code=404, detail="Cuenta de crédito no encontrada")

        payment = self.credits.get_payment(payment_id, user.id)
        if not payment or payment.account_id != account.id:
            raise HTTPException(status_code=404, detail="Abono no encontrado")

        method = self._resolve_payment_method(user, payload.payment_method_id)
        payment.amount = round(float(payload.amount), 2)
        payment.payment_method_id = method.id
        if payload.notes is not None:
            payment.notes = payload.notes.strip() or None

        refreshed = self.credits.get(account.id, user.id)
        self._recalc_account_balance(refreshed)

        self.db.commit()
        self._sync_all_balances(user.id)
        refreshed = self.credits.get(account.id, user.id)
        now = datetime.now(timezone.utc)
        return self._to_out(refreshed, now, include_details=True)
