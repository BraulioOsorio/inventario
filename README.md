# Inventario Modular

Prototipo académico para **Arquitectura de Software** (Tecnológica del Oriente).  
Aplicación de gestión de inventario multi-uso (tienda, papelería, uso personal) con arquitectura modular en la nube.

## Acceso para revisión (producción)

- **URL:** https://inventario-web-7qyp.onrender.com/
- **Correo:** `pruebas@gmail.com`
- **Contraseña:** `prueba123`
- **Repositorio:** https://github.com/BraulioOsorio/inventario

> Nota: en el plan gratuito de Render el servicio puede “dormir”; la primera carga puede tardar unos segundos.

## Estructura

```
AA2-Orquestando-Codigos/
├── backend/          # FastAPI (Python) — API REST + JWT + capas
├── frontend/         # React + Vite — UI de login e inventario
├── docker-compose.yml
├── docs/informe/     # Informe técnico APA (HTML → PDF)
└── .env.example
```

## Arquitectura

- **Capas:** API → Services → Repositories → Postgres (Supabase)
- **Patrones:** Repository, Layered Architecture, JWT Stateless Auth, Cloud Database (BaaS)
- **Auth:** registro/login con contraseña hasheada (bcrypt) y JWT
- **Datos:** usuarios, categorías, productos, movimientos de stock

## Variables de entorno (Render / local)

Copia `.env.example` a `.env` y completa:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Postgres de Supabase (`?sslmode=require`) |
| `DB_PASSWORD` | Contraseña de la base |
| `JWT_SECRET` | Secreto para firmar tokens |
| `CORS_ORIGINS` | Orígenes del front (URL de Render) |
| `VITE_API_URL` | URL pública del backend (solo build del front) |

## Desarrollo local

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.db.init_db
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

### Docker

```bash
docker compose up --build
```

- API: http://localhost:8000  
- Front: http://localhost:8080  

## Deploy en Render

1. **Web Service (backend):** root `backend`, Dockerfile o `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` (URL del front), resto del `.env`
3. **Static Site / Web (frontend):** build `npm run build`, publish `dist`, con `VITE_API_URL` = URL del backend

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `CRUD /api/categories`
- `CRUD /api/products`
- `GET|POST /api/movements`
- `GET /health`

## Autor

David Alejandro Osorio Martínez — Tecnológica del Oriente  
Docente: Edward Villamizar — Arquitectura de Software
