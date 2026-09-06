from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import SupplierOrder, User
from app.repositories.category_repository import CategoryRepository
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

    def list_products(self, user: User, context_type: str | None = None, q: str | None = None) -> list[ProductOut]:
        items = self.products.list_by_owner(user.id, context_type=context_type, q=q)
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
    def list_movements(self, user: User) -> list[MovementOut]:
        return [MovementOut.model_validate(m) for m in self.movements.list_by_owner(user.id)]

    def register_movement(self, user: User, payload: MovementCreate) -> MovementOut:
        product = self.products.get(payload.product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

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
        )
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
    def _is_order_due_soon(self, order: SupplierOrder, now: datetime) -> tuple[bool, datetime | None]:
        if order.status not in {"pendiente", "solicitado"}:
            return False, None

        target_date: datetime | None = None
        if order.is_monthly_recurring and order.monthly_day:
            day = max(1, min(order.monthly_day, 28))
            try:
                this_month = now.replace(day=order.monthly_day, hour=0, minute=0, second=0, microsecond=0)
            except ValueError:
                this_month = now.replace(day=day, hour=0, minute=0, second=0, microsecond=0)

            if this_month.date() >= now.date():
                target_date = this_month
            else:
                next_year = now.year + (1 if now.month == 12 else 0)
                next_month = 1 if now.month == 12 else now.month + 1
                try:
                    target_date = now.replace(
                        year=next_year,
                        month=next_month,
                        day=order.monthly_day,
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
                except ValueError:
                    target_date = now.replace(
                        year=next_year,
                        month=next_month,
                        day=day,
                        hour=0,
                        minute=0,
                        second=0,
                        microsecond=0,
                    )
        elif order.expected_date:
            target_date = order.expected_date

        if not target_date:
            return False, None

        diff_days = (target_date.date() - now.date()).days
        # Una semana antes (<= 7 días) o retrasado (< 0)
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
            product.quantity -= payload.quantity
            self.db.add(product)
            self.movements.create(
                owner_id=user.id,
                product_id=product.id,
                movement_type="out",
                quantity=payload.quantity,
                note=f"Préstamo a {payload.borrower_name}",
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
                product.quantity += loan.quantity
                self.db.add(product)
                self.movements.create(
                    owner_id=user.id,
                    product_id=product.id,
                    movement_type="in",
                    quantity=loan.quantity,
                    note=f"Devolución préstamo de {loan.borrower_name}",
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
                    else f"en {diff} días (fecha mensual)"
                    if diff > 0
                    else f"retrasado por {abs(diff)} días"
                )
                items.append(
                    NotificationItem(
                        id=f"order_{o.id}",
                        category="order",
                        title=f"Pedido: {o.supplier_name}",
                        message=f"'{o.title}' — {timing_str}. Contacto: {o.supplier_contact or 'No especificado'}.",
                        severity="danger" if diff < 0 else "warn",
                        link="/pedidos",
                        date=target_date or o.expected_date,
                        extra={"order_id": str(o.id), "supplier": o.supplier_name, "days": diff},
                    )
                )

        # 3. Alertas de préstamos vencidos
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
