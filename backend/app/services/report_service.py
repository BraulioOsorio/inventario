from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.report_utils import BOGOTA, day_bounds_bogota, month_bounds_bogota
from app.models.entities import User
from app.repositories.product_repository import MovementRepository, ProductRepository
from app.services.credit_service import CreditService


class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.products = ProductRepository(db)
        self.movements = MovementRepository(db)
        self.credits = CreditService(db)

    @staticmethod
    def _line_value(movement) -> float:
        product = movement.product
        price = float(product.unit_price or 0) if product else 0
        return round(price * int(movement.quantity or 0), 2)

    def debtors(self, user: User) -> dict:
        accounts = self.credits.list_accounts(user)
        rows = [
            {
                "cliente": a.customer_name or "Cliente",
                "telefono": a.customer_phone or "—",
                "saldo": float(a.balance_due),
                "estado": "Vencido" if a.is_overdue else "Al día",
                "vence": a.due_date,
            }
            for a in accounts
            if float(a.balance_due) > 0.009
        ]
        rows.sort(key=lambda r: r["saldo"], reverse=True)
        total = round(sum(r["saldo"] for r in rows), 2)
        return {"rows": rows, "total_debt": total, "count": len(rows)}

    def overdue_debtors(self, user: User) -> dict:
        data = self.debtors(user)
        rows = [r for r in data["rows"] if r["estado"] == "Vencido"]
        total = round(sum(r["saldo"] for r in rows), 2)
        return {"rows": rows, "total_debt": total, "count": len(rows)}

    def sales_period(self, user: User, start: datetime, end: datetime) -> dict:
        moves = self.movements.list_sales_movements(user.id, start, end)
        lines = []
        total = 0.0
        units = 0
        for m in moves:
            val = self._line_value(m)
            total += val
            units += int(m.quantity)
            lines.append(
                {
                    "when": m.created_at,
                    "producto": m.product.name if m.product else "—",
                    "qty": m.quantity,
                    "valor": val,
                    "nota": (m.note or "")[:80],
                }
            )
        return {
            "lines": lines,
            "ticket_count": len(lines),
            "units": units,
            "total": round(total, 2),
        }

    def sales_daily(self, user: User, day: date) -> dict:
        start, end = day_bounds_bogota(day)
        data = self.sales_period(user, start, end)
        data["day"] = day
        return data

    def sales_monthly(self, user: User, year: int, month: int) -> dict:
        start, end = month_bounds_bogota(year, month)
        data = self.sales_period(user, start, end)
        by_day: dict[str, dict] = defaultdict(lambda: {"units": 0, "total": 0.0, "tickets": 0})
        for line in data["lines"]:
            d = line["when"].astimezone(BOGOTA).date().isoformat()
            by_day[d]["units"] += line["qty"]
            by_day[d]["total"] += line["valor"]
            by_day[d]["tickets"] += 1
        daily = [
            {"fecha": k, "tickets": v["tickets"], "unidades": v["units"], "total": round(v["total"], 2)}
            for k, v in sorted(by_day.items())
        ]
        data["year"] = year
        data["month"] = month
        data["daily"] = daily
        return data

    def top_products(self, user: User, start: datetime, end: datetime, limit: int = 25) -> dict:
        moves = self.movements.list_sales_movements(user.id, start, end)
        agg: dict[UUID, dict] = {}
        for m in moves:
            pid = m.product_id
            if pid not in agg:
                agg[pid] = {
                    "nombre": m.product.name if m.product else "—",
                    "sku": m.product.sku if m.product else "—",
                    "unidades": 0,
                    "ingresos": 0.0,
                }
            agg[pid]["unidades"] += int(m.quantity)
            agg[pid]["ingresos"] += self._line_value(m)
        rows = sorted(agg.values(), key=lambda r: r["unidades"], reverse=True)[:limit]
        for r in rows:
            r["ingresos"] = round(r["ingresos"], 2)
        return {"rows": rows, "start": start, "end": end}

    def low_stock(self, user: User) -> dict:
        items = self.products.list_by_owner(user.id, active_only=False)
        rows = []
        for p in items:
            if not p.is_active:
                continue
            qty = int(p.quantity)
            min_s = int(p.min_stock)
            if qty <= min_s:
                rows.append(
                    {
                        "producto": p.name,
                        "sku": p.sku,
                        "stock": qty,
                        "minimo": min_s,
                        "estado": "Agotado" if qty <= 0 else "Bajo",
                    }
                )
        rows.sort(key=lambda r: (r["stock"], r["producto"]))
        return {"rows": rows, "count": len(rows)}

    def inventory_valuation(self, user: User) -> dict:
        items = self.products.list_by_owner(user.id, active_only=True)
        by_ctx: dict[str, dict] = defaultdict(lambda: {"productos": 0, "unidades": 0, "valor": 0.0})
        total_units = 0
        total_value = 0.0
        detail = []
        for p in items:
            qty = int(p.quantity or 0)
            price = float(p.unit_price or 0)
            val = qty * price
            ctx = p.context_type or "general"
            by_ctx[ctx]["productos"] += 1
            by_ctx[ctx]["unidades"] += qty
            by_ctx[ctx]["valor"] += val
            total_units += qty
            total_value += val
            detail.append(
                {
                    "producto": p.name,
                    "sku": p.sku,
                    "contexto": ctx,
                    "stock": qty,
                    "precio": price,
                    "valor": round(val, 2),
                }
            )
        detail.sort(key=lambda r: r["valor"], reverse=True)
        ctx_rows = [
            {"contexto": k, "productos": v["productos"], "unidades": v["unidades"], "valor": round(v["valor"], 2)}
            for k, v in sorted(by_ctx.items(), key=lambda x: x[1]["valor"], reverse=True)
        ]
        return {
            "contexts": ctx_rows,
            "top_products": detail[:30],
            "total_units": total_units,
            "total_value": round(total_value, 2),
            "sku_count": len(items),
        }

    def movements_summary(self, user: User, start: datetime, end: datetime) -> dict:
        moves = self.movements.list_movements_in_range(user.id, start, end)
        counts = {"in": 0, "out": 0, "adjust": 0}
        units = {"in": 0, "out": 0, "adjust": 0}
        for m in moves:
            t = m.movement_type
            if t not in counts:
                continue
            counts[t] += 1
            units[t] += int(m.quantity)
        pos_sales = self.sales_period(user, start, end)
        return {
            "counts": counts,
            "units": units,
            "pos_total": pos_sales["total"],
            "pos_tickets": pos_sales["ticket_count"],
            "start": start,
            "end": end,
        }

    def executive_summary(self, user: User, today: date) -> dict:
        start_day, end_day = day_bounds_bogota(today)
        y, m = today.year, today.month
        start_month, end_month = month_bounds_bogota(y, m)
        debt = self.credits.summary(user)
        sales_today = self.sales_daily(user, today)
        sales_month = self.sales_period(user, start_month, end_month)
        stock = self.low_stock(user)
        val = self.inventory_valuation(user)
        return {
            "today": today,
            "debt_active": debt.active_count,
            "debt_total": debt.total_debt,
            "debt_overdue": debt.overdue_count,
            "sales_today": sales_today["total"],
            "sales_today_units": sales_today["units"],
            "sales_month": sales_month["total"],
            "low_stock_count": stock["count"],
            "inventory_value": val["total_value"],
            "sku_active": val["sku_count"],
        }
