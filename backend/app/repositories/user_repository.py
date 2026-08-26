from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email.lower()).first()

    def get_by_id(self, user_id: UUID) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def list_all(self) -> list[User]:
        return self.db.query(User).order_by(User.created_at.desc()).all()

    def create(
        self,
        email: str,
        full_name: str,
        password_hash: str,
        *,
        is_admin: bool = False,
        is_active: bool = True,
    ) -> User:
        user = User(
            email=email.lower(),
            full_name=full_name,
            password_hash=password_hash,
            is_admin=is_admin,
            is_active=is_active,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User, **fields) -> User:
        for key, value in fields.items():
            if value is not None:
                setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)
        return user
