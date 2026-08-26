"""
Inventario Modular — API FastAPI
Arquitectura en capas: API → Services → Repositories → DB (Supabase/Postgres)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, products, categories, movements, health, users

app = FastAPI(
    title=settings.APP_NAME,
    description="API de gestión de inventario multi-uso (tienda, papelería, uso personal).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(movements.router, prefix="/api/movements", tags=["Movements"])
