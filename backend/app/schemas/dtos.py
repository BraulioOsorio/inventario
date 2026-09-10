from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.password_policy import assert_strong_password


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        assert_strong_password(value)
        return value


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    is_admin: bool = False
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        assert_strong_password(value)
        return value


class UserUpdateAdmin(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    is_admin: bool | None = None
    is_active: bool | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str | None) -> str | None:
        if value is not None:
            assert_strong_password(value)
        return value


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        assert_strong_password(value)
        return value


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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    email_sent: bool = False


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        assert_strong_password(value)
        return value


class SimpleMessageResponse(BaseModel):
    message: str


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


# --- Clientes (Customer) ---
class CustomerCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    document_id: str | None = Field(default=None, max_length=60)
    email: str | None = None
    phone: str | None = Field(default=None, max_length=60)
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    document_id: str | None = Field(default=None, max_length=60)
    email: str | None = None
    phone: str | None = Field(default=None, max_length=60)
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    is_active: bool | None = None


class CustomerOut(BaseModel):
    id: UUID
    full_name: str
    document_id: str | None
    email: str | None
    phone: str | None
    address: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Pedidos / Órdenes a Proveedores (SupplierOrder) ---
class SupplierOrderCreate(BaseModel):
    supplier_name: str = Field(min_length=2, max_length=200)
    supplier_contact: str | None = Field(default=None, max_length=120)
    title: str = Field(min_length=2, max_length=200)
    items_summary: str | None = None
    expected_date: datetime | None = None
    is_monthly_recurring: bool = False
    monthly_day: int | None = Field(default=None, ge=1, le=31)
    estimated_total: float = Field(default=0, ge=0)
    status: str = Field(default="pendiente", pattern="^(pendiente|solicitado|recibido|cancelado)$")
    notes: str | None = None


class SupplierOrderUpdate(BaseModel):
    supplier_name: str | None = Field(default=None, min_length=2, max_length=200)
    supplier_contact: str | None = Field(default=None, max_length=120)
    title: str | None = Field(default=None, min_length=2, max_length=200)
    items_summary: str | None = None
    expected_date: datetime | None = None
    is_monthly_recurring: bool | None = None
    monthly_day: int | None = Field(default=None, ge=1, le=31)
    estimated_total: float | None = Field(default=None, ge=0)
    status: str | None = Field(default=None, pattern="^(pendiente|solicitado|recibido|cancelado)$")
    notes: str | None = None


class SupplierOrderOut(BaseModel):
    id: UUID
    supplier_name: str
    supplier_contact: str | None
    title: str
    items_summary: str | None
    expected_date: datetime | None
    is_monthly_recurring: bool
    monthly_day: int | None
    estimated_total: float
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    is_due_soon: bool = False  # Próximo a vencer / realizarse en <= 7 días

    model_config = {"from_attributes": True}


# --- Préstamos (Loan) ---
class LoanCreate(BaseModel):
    product_id: UUID
    customer_id: UUID | None = None
    borrower_name: str = Field(min_length=2, max_length=200)
    borrower_contact: str | None = Field(default=None, max_length=120)
    quantity: int = Field(default=1, gt=0)
    due_date: datetime | None = None
    notes: str | None = None
    discount_stock: bool = True  # Descuenta unidades del stock activo mientras esté prestado


class LoanUpdate(BaseModel):
    borrower_name: str | None = Field(default=None, min_length=2, max_length=200)
    borrower_contact: str | None = Field(default=None, max_length=120)
    due_date: datetime | None = None
    status: str | None = Field(default=None, pattern="^(activo|devuelto|vencido)$")
    notes: str | None = None


class LoanReturnRequest(BaseModel):
    return_to_stock: bool = True  # Si se devuelven las unidades prestadas al stock
    notes: str | None = None


class LoanOut(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str | None = None
    customer_id: UUID | None
    customer_name: str | None = None
    borrower_name: str
    borrower_contact: str | None
    quantity: int
    loan_date: datetime
    due_date: datetime | None
    returned_date: datetime | None
    status: str
    notes: str | None
    created_at: datetime
    is_overdue: bool = False

    model_config = {"from_attributes": True}


# --- Notificaciones Globales / Campanita ---
class NotificationItem(BaseModel):
    id: str
    category: str  # "stock" | "order" | "loan"
    title: str
    message: str
    date: datetime | None = None
    severity: str  # "danger" | "warn" | "info"
    link: str
    extra: dict | None = None


class NotificationsSummary(BaseModel):
    total_unread: int
    items: list[NotificationItem]
