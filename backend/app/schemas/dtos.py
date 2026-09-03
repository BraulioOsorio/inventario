from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    is_admin: bool = False
    is_active: bool = True


class UserUpdateAdmin(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    is_admin: bool | None = None
    is_active: bool | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    is_admin: bool = False
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None


class CategoryOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=80)
    description: str | None = None
    unit: str = "unidad"
    quantity: int = Field(default=0, ge=0)
    min_stock: int = Field(default=0, ge=0)
    unit_price: float = Field(default=0, ge=0)
    context_type: str = Field(default="general", pattern="^(tienda|papeleria|personal|general)$")
    category_id: UUID | None = None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    unit: str | None = None
    min_stock: int | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None, ge=0)
    context_type: str | None = Field(default=None, pattern="^(tienda|papeleria|personal|general)$")
    category_id: UUID | None = None
    is_active: bool | None = None


class ProductOut(BaseModel):
    id: UUID
    name: str
    sku: str
    description: str | None
    unit: str
    quantity: int
    min_stock: int
    unit_price: float
    context_type: str
    category_id: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    low_stock: bool = False
    has_movements: bool = False

    model_config = {"from_attributes": True}


class MovementCreate(BaseModel):
    product_id: UUID
    movement_type: str = Field(pattern="^(in|out|adjust)$")
    quantity: int = Field(gt=0)
    note: str | None = None


class MovementOut(BaseModel):
    id: UUID
    product_id: UUID
    movement_type: str
    quantity: int
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
