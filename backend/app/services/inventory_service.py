from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.entities import User
from app.repositories.category_repository import CategoryRepository
from app.repositories.product_repository import MovementRepository, ProductRepository
from app.schemas.dtos import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    MovementCreate,
    MovementOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)


class InventoryService:
    def __init__(self, db: Session):
        self.db = db
        self.categories = CategoryRepository(db)
        self.products = ProductRepository(db)
        self.movements = MovementRepository(db)

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
    def list_products(self, user: User, context_type: str | None = None, q: str | None = None) -> list[ProductOut]:
        items = self.products.list_by_owner(user.id, context_type=context_type, q=q)
        result: list[ProductOut] = []
        for item in items:
            out = ProductOut.model_validate(item)
            out.low_stock = item.quantity <= item.min_stock
            result.append(out)
        return result

    def create_product(self, user: User, payload: ProductCreate) -> ProductOut:
        if payload.category_id and not self.categories.get(payload.category_id, user.id):
            raise HTTPException(status_code=400, detail="Categoría inválida")
        try:
            product = self.products.create(user.id, **payload.model_dump())
        except Exception as exc:
            raise HTTPException(status_code=400, detail="No se pudo crear el producto (¿SKU duplicado?)") from exc
        out = ProductOut.model_validate(product)
        out.low_stock = product.quantity <= product.min_stock
        return out

    def update_product(self, user: User, product_id: UUID, payload: ProductUpdate) -> ProductOut:
        product = self.products.get(product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        data = payload.model_dump(exclude_unset=True)
        if "category_id" in data and data["category_id"] is not None:
            if not self.categories.get(data["category_id"], user.id):
                raise HTTPException(status_code=400, detail="Categoría inválida")
        updated = self.products.update(product, **data)
        out = ProductOut.model_validate(updated)
        out.low_stock = updated.quantity <= updated.min_stock
        return out

    def delete_product(self, user: User, product_id: UUID) -> None:
        product = self.products.get(product_id, user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
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
