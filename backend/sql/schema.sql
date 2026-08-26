-- Inventario Modular — referencia del esquema aplicado por SQLAlchemy
-- Las tablas ya se crean con: python -m app.db.init_db

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users, categories, products, stock_movements
-- Columnas clave:
--   users: id, email, full_name, password_hash, is_active, created_at
--   categories: id, owner_id, name, description, created_at
--   products: id, owner_id, category_id, name, sku, description, unit,
--             quantity, min_stock, unit_price, context_type, is_active, ...
--   stock_movements: id, owner_id, product_id, movement_type (in|out|adjust),
--                    quantity, note, created_at
