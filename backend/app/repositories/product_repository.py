from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Product, StockMovement


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(
        self,
        owner_id: UUID,
        context_type: str | None = None,
        q: str | None = None,
    ) -> list[Product]:
        query = self.db.query(Product).filter(Product.owner_id == owner_id, Product.is_active.is_(True))
        if context_type:
            query = query.filter(Product.context_type == context_type)
        if q:
            like = f"%{q.strip()}%"
            query = query.filter((Product.name.ilike(like)) | (Product.sku.ilike(like)))
        return query.order_by(Product.name.asc()).all()

    def get(self, product_id: UUID, owner_id: UUID) -> Product | None:
        return (
            self.db.query(Product)
            .filter(Product.id == product_id, Product.owner_id == owner_id)
            .first()
        )

    def create(self, owner_id: UUID, **data) -> Product:
        product = Product(owner_id=owner_id, **data)
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def update(self, product: Product, **fields) -> Product:
        for key, value in fields.items():
            if value is not None or key in {"description", "category_id"}:
                setattr(product, key, value)
        self.db.commit()
        self.db.refresh(product)
        return product

    def soft_delete(self, product: Product) -> None:
        product.is_active = False
        self.db.commit()

    def ids_with_movements(self, owner_id: UUID) -> set[UUID]:
        rows = (
            self.db.query(StockMovement.product_id)
            .filter(StockMovement.owner_id == owner_id)
            .distinct()
            .all()
        )
        return {row[0] for row in rows}

    def movement_count(self, product_id: UUID) -> int:
        return self.db.query(StockMovement).filter(StockMovement.product_id == product_id).count()


class MovementRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(self, owner_id: UUID, limit: int = 50) -> list[StockMovement]:
        return (
            self.db.query(StockMovement)
            .filter(StockMovement.owner_id == owner_id)
            .order_by(StockMovement.created_at.desc())
            .limit(limit)
            .all()
        )

    def create(self, owner_id: UUID, product_id: UUID, movement_type: str, quantity: int, note: str | None):
        movement = StockMovement(
            owner_id=owner_id,
            product_id=product_id,
            movement_type=movement_type,
            quantity=quantity,
            note=note,
        )
        self.db.add(movement)
        self.db.commit()
        self.db.refresh(movement)
        return movement
