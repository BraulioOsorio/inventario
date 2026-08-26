from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Category


class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_owner(self, owner_id: UUID) -> list[Category]:
        return (
            self.db.query(Category)
            .filter(Category.owner_id == owner_id)
            .order_by(Category.name.asc())
            .all()
        )

    def get(self, category_id: UUID, owner_id: UUID) -> Category | None:
        return (
            self.db.query(Category)
            .filter(Category.id == category_id, Category.owner_id == owner_id)
            .first()
        )

    def create(self, owner_id: UUID, name: str, description: str | None) -> Category:
        category = Category(owner_id=owner_id, name=name.strip(), description=description)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update(self, category: Category, **fields) -> Category:
        for key, value in fields.items():
            if value is not None:
                setattr(category, key, value)
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category: Category) -> None:
        self.db.delete(category)
        self.db.commit()
