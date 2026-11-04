from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import SupplierOrder, User
from app.repositories.category_repository import CategoryRepository
from app.repositories.credit_repository import CreditRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import MovementRepository, ProductRepository
from app.schemas.dtos import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    CustomerCreate,
    CustomerOut,
    CustomerUpdate,
    LoanCreate,
    LoanOut,
    LoanReturnRequest,
    LoanUpdate,
    MovementCreate,
    MovementOut,
    MovementPageOut,
    NotificationItem,
    NotificationsSummary,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    SupplierOrderCreate,
    SupplierOrderOut,
    SupplierOrderUpdate,
)


class InventoryService:
    def __init__(self, db: Session):
        self.db = db
        self.categories = CategoryRepository(db)
        self.products = ProductRepository(db)
        self.movements = MovementRepository(db)
        self.customers = CustomerRepository(db)
        self.orders = OrderRepository(db)
        self.loans = LoanRepository(db)
        self.credits = CreditRepository(db)

    # --- Categories ---
    def list_categories(self, user: User) -> list[CategoryOut]:
        return [CategoryOut.model_validate(c) for c in self.categories.list_by_owner(user.id)]

    def create_category(self, user: User, payload: CategoryCreate) -> CategoryOut:
        try:
            category = self.categories.create(user.id, payload.name, payload.description)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="No se pudo crear la categoría (¿nombre duplicado?)") from exc
        return CategoryOut.model_validate(category)

    def update_category(self, user: User, category_id: UUID, payload: CategoryUpdate) -> CategoryOut:
        category = self.categories.get(category_id, user.id)
        if not category:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        updated = self.categories.update(category, **payload.model_dump(exclude_unset=True))
        return CategoryOut.model_validate(updated)

    def delete_category(self, user: User, category_id: UUID) -> None:
        category = self.categories.get(category_id, user.id)
        if not category:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        self.categories.delete(category)

    # --- Products ---
    def _product_out(self, product, moved_ids: set | None = None) -> ProductOut:
        out = ProductOut.model_validate(product)
        out.low_stock = product.quantity <= product.min_stock
        if moved_ids is not None:
            out.has_movements = product.id in moved_ids
        else:
            out.has_movements = self.products.movement_count(product.id) > 0
        return out

    def list_products(
        self,
        user: User,
        context_type: str | None = None,
        q: str | None = None,
        active_only: bool = True,
    ) -> list[ProductOut]:
        items = self.products.list_by_owner(
            user.id, context_type=context_type, q=q, active_only=active_only
        )
        moved_ids = self.products.ids_with_movements(user.id)
        return [self._product_out(item, moved_ids) for item in items]

    def create_product(self, user: User, payload: ProductCreate) -> ProductOut:
        if payload.category_id and not self.categories.get(payload.category_id, user.id):
            raise HTTPException(status_code=400, detail="Categoría inválida")
        try:
            product = self.products.create(user.id, **payload.model_dump())
        except Exception as exc:
            raise HTTPException(status_code=400, detail="No se pudo crear el producto") from exc
        return self._product_out(product, set())

    def update_product(self, user: User, product_id: UUID, payload: ProductUpdate) -> ProductOut:
        product = self.products.get(product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        data = payload.model_dump(exclude_unset=True)
        if "category_id" in data and data["category_id"] is not None:
            if not self.categories.get(data["category_id"], user.id):
                raise HTTPException(status_code=400, detail="Categoría inválida")
        updated = self.products.update(product, **data)
        return self._product_out(updated)

    def delete_product(self, user: User, product_id: UUID) -> None:
        product = self.products.get(product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        if self.products.movement_count(product.id) > 0:
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar: el producto tiene movimientos registrados",
            )
        self.products.soft_delete(product)

    # --- Movements ---
    def list_movements(self, user: User, page: int = 1, page_size: int = 15) -> MovementPageOut:
        page_size = max(1, min(page_size, 100))
        page = max(1, page)
        offset = (page - 1) * page_size
        total = self.movements.count_by_owner(user.id)
        rows = self.movements.list_by_owner(user.id, limit=page_size, offset=offset)
        return MovementPageOut(
            items=[MovementOut.model_validate(m) for m in rows],
            total=total,
            page=page,
            page_size=page_size,
        )

    def register_movement(self, user: User, payload: MovementCreate) -> MovementOut:
        product = self.products.get(payload.product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        if not product.is_active and payload.movement_type in {"out", "adjust"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El producto está inactivo y no puede venderse ni ajustarse",
            )

        stock_before = product.quantity
        if payload.movement_type == "in":
            product.quantity += payload.quantity
        elif payload.movement_type == "out":
            if product.quantity < payload.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock insuficiente")
            product.quantity -= payload.quantity
        elif payload.movement_type == "adjust":
            product.quantity = payload.quantity
        else:
            raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")

        self.db.add(product)
        movement = self.movements.create(
            owner_id=user.id,
            product_id=product.id,
            movement_type=payload.movement_type,
            quantity=payload.quantity,
            note=payload.note,
            stock_before=stock_before,
        )
        return MovementOut.model_validate(movement)

    def revert_movement(self, user: User, movement_id: UUID) -> MovementOut:
        movement = self.movements.get(movement_id, user.id)
        if not movement:
            raise HTTPException(status_code=404, detail="Movimiento no encontrado")
        if movement.reverted_at is not None:
            raise HTTPException(status_code=400, detail="Este movimiento ya fue revertido")

        product = self.products.get(movement.product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        if movement.movement_type == "in":
            if product.quantity < movement.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No hay stock suficiente para revertir esta entrada",
                )
            product.quantity -= movement.quantity
        elif movement.movement_type == "out":
            product.quantity += movement.quantity
        elif movement.movement_type == "adjust":
            if movement.stock_before is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se puede revertir este ajuste (registro anterior sin respaldo)",
                )
            product.quantity = movement.stock_before
        else:
            raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")

        movement.reverted_at = datetime.now(timezone.utc)
        self.db.add(product)
        self.db.add(movement)
        self.db.commit()
        self.db.refresh(movement)
        return MovementOut.model_validate(movement)

    # --- Clientes (Customer) ---
    def list_customers(self, user: User, q: str | None = None) -> list[CustomerOut]:
        items = self.customers.list_by_owner(user.id, q=q)
        return [CustomerOut.model_validate(c) for c in items]

    def create_customer(self, user: User, payload: CustomerCreate) -> CustomerOut:
        customer = self.customers.create(user.id, **payload.model_dump())
        return CustomerOut.model_validate(customer)

    def update_customer(self, user: User, customer_id: UUID, payload: CustomerUpdate) -> CustomerOut:
        customer = self.customers.get(customer_id, user.id)
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        updated = self.customers.update(customer, **payload.model_dump(exclude_unset=True))
        return CustomerOut.model_validate(updated)

    def delete_customer(self, user: User, customer_id: UUID) -> None:
        customer = self.customers.get(customer_id, user.id)
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        self.customers.soft_delete(customer)

    # --- Pedidos / Órdenes a Proveedores (SupplierOrder) ---
    @staticmethod
    def _safe_month_day(reference: datetime, monthly_day: int) -> datetime:
        day = max(1, min(monthly_day, 28))
        try:
            return reference.replace(day=monthly_day, hour=0, minute=0, second=0, microsecond=0)
        except ValueError:
            return reference.replace(day=day, hour=0, minute=0, second=0, microsecond=0)

    def _monthly_target_from(self, now: datetime, monthly_day: int) -> datetime:
        """Próxima fecha mensual (hoy o futuro en el calendario)."""
        this_month = self._safe_month_day(now, monthly_day)
        if this_month.date() >= now.date():
            return this_month
        next_year = now.year + (1 if now.month == 12 else 0)
        next_month = 1 if now.month == 12 else now.month + 1
        anchor = now.replace(
            year=next_year,
            month=next_month,
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        return self._safe_month_day(anchor, monthly_day)

    def _is_order_due_soon(self, order: SupplierOrder, now: datetime) -> tuple[bool, datetime | None]:
        if order.status == "cancelado":
            return False, None

        target_date: datetime | None = None

        if order.is_monthly_recurring and order.monthly_day:
            # Pedidos recurrentes: avisar cada mes (7 días antes), aunque estén en "recibido"
            # del ciclo anterior; solo se excluye "cancelado".
            this_cycle = self._safe_month_day(now, order.monthly_day)
            if order.status == "recibido" and now.date() > this_cycle.date():
                anchor = this_cycle + timedelta(days=1)
                target_date = self._monthly_target_from(anchor, order.monthly_day)
            else:
                target_date = self._monthly_target_from(now, order.monthly_day)
        else:
            if order.status not in {"pendiente", "solicitado"}:
                return False, None
            target_date = order.expected_date
            if target_date and target_date.tzinfo is None:
                target_date = target_date.replace(tzinfo=timezone.utc)

        if not target_date:
            return False, None

        diff_days = (target_date.date() - now.date()).days
        return diff_days <= 7, target_date

    def list_orders(
        self,
        user: User,
        status: str | None = None,
        q: str | None = None,
    ) -> list[SupplierOrderOut]:
        orders = self.orders.list_by_owner(user.id, status=status, q=q)
        now = datetime.now(timezone.utc)
        result = []
        for o in orders:
            out = SupplierOrderOut.model_validate(o)
            is_due, _ = self._is_order_due_soon(o, now)
            out.is_due_soon = is_due
            result.append(out)
        return result

    def create_order(self, user: User, payload: SupplierOrderCreate) -> SupplierOrderOut:
        order = self.orders.create(user.id, **payload.model_dump())
        now = datetime.now(timezone.utc)
        out = SupplierOrderOut.model_validate(order)
        is_due, _ = self._is_order_due_soon(order, now)
        out.is_due_soon = is_due
        return out

    def update_order(self, user: User, order_id: UUID, payload: SupplierOrderUpdate) -> SupplierOrderOut:
        order = self.orders.get(order_id, user.id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        updated = self.orders.update(order, **payload.model_dump(exclude_unset=True))
        now = datetime.now(timezone.utc)
        out = SupplierOrderOut.model_validate(updated)
        is_due, _ = self._is_order_due_soon(updated, now)
        out.is_due_soon = is_due
        return out

    def delete_order(self, user: User, order_id: UUID) -> None:
        order = self.orders.get(order_id, user.id)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        self.orders.delete(order)

    # --- Préstamos (Loan) ---
    def _loan_out(self, loan, now: datetime) -> LoanOut:
        out = LoanOut.model_validate(loan)
        out.product_name = loan.product.name if loan.product else None
        out.customer_name = loan.customer.full_name if loan.customer else None
        if loan.status == "activo" and loan.due_date:
            out.is_overdue = loan.due_date.date() < now.date()
        else:
            out.is_overdue = False
        return out

    def list_loans(
        self,
        user: User,
        status: str | None = None,
        product_id: UUID | None = None,
    ) -> list[LoanOut]:
        items = self.loans.list_by_owner(user.id, status=status, product_id=product_id)
        now = datetime.now(timezone.utc)
        return [self._loan_out(item, now) for item in items]

    def create_loan(self, user: User, payload: LoanCreate) -> LoanOut:
        product = self.products.get(payload.product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        if payload.customer_id:
            customer = self.customers.get(payload.customer_id, user.id)
            if not customer:
                raise HTTPException(status_code=404, detail="Cliente no encontrado")

        if payload.discount_stock:
            if product.quantity < payload.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para prestar ({product.quantity} disponibles)",
                )
            stock_before = product.quantity
            product.quantity -= payload.quantity
            self.db.add(product)
            self.movements.create(
                owner_id=user.id,
                product_id=product.id,
                movement_type="out",
                quantity=payload.quantity,
                note=f"Préstamo a {payload.borrower_name}",
                stock_before=stock_before,
            )

        data = payload.model_dump(exclude={"discount_stock"})
        loan = self.loans.create(owner_id=user.id, **data)
        now = datetime.now(timezone.utc)
        return self._loan_out(loan, now)

    def update_loan(self, user: User, loan_id: UUID, payload: LoanUpdate) -> LoanOut:
        loan = self.loans.get(loan_id, user.id)
        if not loan:
            raise HTTPException(status_code=404, detail="Préstamo no encontrado")
        updated = self.loans.update(loan, **payload.model_dump(exclude_unset=True))
        now = datetime.now(timezone.utc)
        return self._loan_out(updated, now)

    def return_loan(self, user: User, loan_id: UUID, payload: LoanReturnRequest) -> LoanOut:
        loan = self.loans.get(loan_id, user.id)
        if not loan:
            raise HTTPException(status_code=404, detail="Préstamo no encontrado")
        if loan.status == "devuelto":
            raise HTTPException(status_code=400, detail="Este préstamo ya fue marcado como devuelto")

        loan.status = "devuelto"
        loan.returned_date = datetime.now(timezone.utc)
        if payload.notes:
            loan.notes = (loan.notes or "") + f" | Devolución: {payload.notes}"

        if payload.return_to_stock:
            product = self.products.get(loan.product_id, user.id)
            if product:
                stock_before = product.quantity
                product.quantity += loan.quantity
                self.db.add(product)
                self.movements.create(
                    owner_id=user.id,
                    product_id=product.id,
                    movement_type="in",
                    quantity=loan.quantity,
                    note=f"Devolución préstamo de {loan.borrower_name}",
                    stock_before=stock_before,
                )

        self.db.add(loan)
        self.db.commit()
        self.db.refresh(loan)
        now = datetime.now(timezone.utc)
        return self._loan_out(loan, now)

    def delete_loan(self, user: User, loan_id: UUID) -> None:
        loan = self.loans.get(loan_id, user.id)
        if not loan:
            raise HTTPException(status_code=404, detail="Préstamo no encontrado")
        self.loans.delete(loan)

    # --- Notificaciones Globales / Campanita ---
    def get_notifications(self, user: User) -> NotificationsSummary:
        now = datetime.now(timezone.utc)
        items: list[NotificationItem] = []

        # 1. Alertas de inventario bajo o agotado
        products = self.products.list_by_owner(user.id)
        for p in products:
            if p.quantity <= 0:
                items.append(
                    NotificationItem(
                        id=f"stock_empty_{p.id}",
                        category="stock",
                        title=f"Agotado: {p.name}",
                        message=f"El producto no tiene existencias disponibles.",
                        severity="danger",
                        link="/movimientos",
                        date=p.updated_at,
                        extra={"product_id": str(p.id), "quantity": 0, "min_stock": p.min_stock},
                    )
                )
            elif p.quantity <= p.min_stock:
                items.append(
                    NotificationItem(
                        id=f"stock_low_{p.id}",
                        category="stock",
                        title=f"Stock bajo: {p.name}",
                        message=f"Quedan solo {p.quantity} {p.unit} (mínimo configurado: {p.min_stock}).",
                        severity="warn",
                        link="/movimientos",
                        date=p.updated_at,
                        extra={"product_id": str(p.id), "quantity": p.quantity, "min_stock": p.min_stock},
                    )
                )

        # 2. Alertas de pedidos a proveedores (una semana antes o vencidos)
        orders = self.orders.list_by_owner(user.id)
        for o in orders:
            is_due, target_date = self._is_order_due_soon(o, now)
            if is_due:
                diff = (target_date.date() - now.date()).days if target_date else 0
                timing_str = (
                    "¡Hoy es la fecha programada!"
                    if diff == 0
                    else f"en {diff} días"
                    if diff > 0
                    else f"retrasado por {abs(diff)} días"
                )
                cycle_hint = " (pedido mensual)" if o.is_monthly_recurring else ""
                items.append(
                    NotificationItem(
                        id=f"order_{o.id}_{target_date.date().isoformat()}",
                        category="order",
                        title=f"Pedido: {o.supplier_name}",
                        message=(
                            f"'{o.title}'{cycle_hint} — {timing_str}. "
                            f"Contacto: {o.supplier_contact or 'No especificado'}."
                        ),
                        severity="danger" if diff < 0 else "warn",
                        link="/pedidos",
                        date=target_date or o.expected_date,
                        extra={"order_id": str(o.id), "supplier": o.supplier_name, "days": diff},
                    )
                )

        # 3. Créditos vencidos (cuenta cliente)
        credit_accounts = self.credits.list_by_owner(user.id, status="activo")
        for acc in credit_accounts:
            if float(acc.balance_due) <= 0 or not acc.due_date:
                continue
            if acc.due_date.date() < now.date():
                days_overdue = (now.date() - acc.due_date.date()).days
                name = acc.customer.full_name if acc.customer else "Cliente"
                items.append(
                    NotificationItem(
                        id=f"credit_overdue_{acc.id}",
                        category="loan",
                        title=f"Crédito vencido: {name}",
                        message=f"Debe ${float(acc.balance_due):,.0f} (vencido hace {days_overdue} días).",
                        severity="danger",
                        link="/prestamos",
                        date=acc.due_date,
                        extra={"credit_account_id": str(acc.id), "customer": name},
                    )
                )

        # 4. Alertas de préstamos vencidos (legacy)
        loans = self.loans.list_by_owner(user.id, status="activo")
        for l in loans:
            if l.due_date and l.due_date.date() < now.date():
                days_overdue = (now.date() - l.due_date.date()).days
                items.append(
                    NotificationItem(
                        id=f"loan_overdue_{l.id}",
                        category="loan",
                        title=f"Préstamo vencido: {l.borrower_name}",
                        message=f"{l.quantity} und de {l.product.name if l.product else 'ítem'} (vencido hace {days_overdue} días).",
                        severity="danger",
                        link="/prestamos",
                        date=l.due_date,
                        extra={"loan_id": str(l.id), "borrower": l.borrower_name},
                    )
                )

        return NotificationsSummary(total_unread=len(items), items=items)
