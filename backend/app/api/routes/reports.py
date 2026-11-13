from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.services.report_pdf import ReportPdfBuilder
from app.services.report_service import ReportService

router = APIRouter()

REPORT_NAMES = {
    "executive": "resumen-ejecutivo",
    "debtors": "clientes-deudores",
    "overdue": "fiados-vencidos",
    "sales-daily": "ventas-dia",
    "sales-monthly": "ventas-mes",
    "top-products": "productos-top",
    "low-stock": "stock-bajo",
    "inventory": "inventario-valorizado",
    "movements": "movimientos",
}


def _parse_day(value: str) -> date:
    try:
        return date.fromisoformat(value.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Fecha inválida (YYYY-MM-DD)") from exc


def _pdf_response(data: bytes, filename: str) -> Response:
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )


@router.get("/{report_key}/pdf")
def download_report_pdf(
    report_key: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    day: str | None = Query(default=None, description="YYYY-MM-DD"),
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    year: int | None = Query(default=None, ge=2020, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    limit: int = Query(default=25, ge=5, le=100),
) -> Response:
    if report_key not in REPORT_NAMES:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    service = ReportService(db)
    pdf = ReportPdfBuilder(service, user)
    today = date.today()

    if report_key == "executive":
        target = _parse_day(day) if day else today
        data = pdf.executive(target)
    elif report_key == "debtors":
        data = pdf.debtors()
    elif report_key == "overdue":
        data = pdf.overdue()
    elif report_key == "sales-daily":
        target = _parse_day(day) if day else today
        data = pdf.sales_daily(target)
    elif report_key == "sales-monthly":
        y = year or today.year
        m = month or today.month
        data = pdf.sales_monthly(y, m)
    elif report_key == "top-products":
        start = _parse_day(from_date) if from_date else today.replace(day=1)
        end = _parse_day(to_date) if to_date else today
        if end < start:
            raise HTTPException(status_code=400, detail="La fecha final debe ser posterior a la inicial")
        data = pdf.top_products(start, end, limit)
    elif report_key == "low-stock":
        data = pdf.low_stock()
    elif report_key == "inventory":
        data = pdf.inventory_valuation()
    elif report_key == "movements":
        start = _parse_day(from_date) if from_date else today.replace(day=1)
        end = _parse_day(to_date) if to_date else today
        if end < start:
            raise HTTPException(status_code=400, detail="La fecha final debe ser posterior a la inicial")
        data = pdf.movements_summary(start, end)
    else:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    return _pdf_response(data, REPORT_NAMES[report_key])
