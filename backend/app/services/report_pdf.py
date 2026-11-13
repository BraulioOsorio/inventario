"""PDFs de reportes con estilo claro (inventario modular)."""
from __future__ import annotations

from datetime import date, datetime, timezone
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.report_utils import BOGOTA, fmt_cop, fmt_date, fmt_datetime
from app.models.entities import User
from app.services.report_service import ReportService

INDIGO = colors.HexColor("#4f46e5")
INDIGO_SOFT = colors.HexColor("#eef2ff")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748b")
BORDER = colors.HexColor("#e2e8f0")


class ReportPdfBuilder:
    def __init__(self, service: ReportService, user: User):
        self.service = service
        self.user = user
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            "RptTitle",
            parent=self.styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=colors.white,
            spaceAfter=2,
        )
        self.sub_style = ParagraphStyle(
            "RptSub",
            parent=self.styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=colors.HexColor("#e0e7ff"),
        )
        self.h2 = ParagraphStyle(
            "RptH2",
            parent=self.styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=INDIGO,
            spaceBefore=10,
            spaceAfter=6,
        )
        self.body = ParagraphStyle(
            "RptBody",
            parent=self.styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=SLATE,
        )

    def _build_doc(self, story: list, *, title: str, subtitle: str) -> bytes:
        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            leftMargin=0.65 * inch,
            rightMargin=0.65 * inch,
            topMargin=0.55 * inch,
            bottomMargin=0.6 * inch,
            title=title,
        )
        header = Table(
            [[Paragraph(title, self.title_style)], [Paragraph(subtitle, self.sub_style)]],
            colWidths=[6.7 * inch],
        )
        header.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), INDIGO),
                    ("LEFTPADDING", (0, 0), (-1, -1), 14),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                    ("TOPPADDING", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
                ]
            )
        )
        meta = Paragraph(
            f"<font color='#64748b'>Generado: {fmt_datetime(datetime.now(timezone.utc))} · "
            f"{self.user.full_name} · Inventario Modular</font>",
            self.body,
        )
        full = [header, Spacer(1, 10), meta, Spacer(1, 8), *story]
        doc.build(full)
        return buf.getvalue()

    @staticmethod
    def _table(data: list[list], col_widths: list[float] | None = None) -> Table:
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), INDIGO_SOFT),
                    ("TEXTCOLOR", (0, 0), (-1, 0), INDIGO),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                    ("GRID", (0, 0), (-1, -1), 0.25, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        return t

    def _kpi_row(self, items: list[tuple[str, str]]) -> Table:
        cells = [[Paragraph(f"<b>{label}</b><br/><font size='11' color='#4f46e5'>{value}</font>", self.body) for label, value in items]]
        t = Table(cells, colWidths=[1.65 * inch] * len(items))
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                    ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                    ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        return t

    def executive(self, today: date) -> bytes:
        data = self.service.executive_summary(self.user, today)
        story = [
            self._kpi_row(
                [
                    ("Ventas hoy", fmt_cop(data["sales_today"])),
                    ("Ventas del mes", fmt_cop(data["sales_month"])),
                    ("Deuda fiados", fmt_cop(data["debt_total"])),
                    ("Valor inventario", fmt_cop(data["inventory_value"])),
                ]
            ),
            Spacer(1, 12),
            self._kpi_row(
                [
                    ("Cuentas con deuda", str(data["debt_active"])),
                    ("Fiados vencidos", str(data["debt_overdue"])),
                    ("SKU con stock bajo", str(data["low_stock_count"])),
                    ("Productos activos", str(data["sku_active"])),
                ]
            ),
            Spacer(1, 14),
            Paragraph("Resumen para control diario del negocio.", self.body),
        ]
        return self._build_doc(
            story,
            title="Resumen ejecutivo",
            subtitle=f"Corte {fmt_date(today)}",
        )

    def debtors(self) -> bytes:
        data = self.service.debtors(self.user)
        story = [
            self._kpi_row([("Clientes deudores", str(data["count"])), ("Total por cobrar", fmt_cop(data["total_debt"]))]),
            Spacer(1, 10),
        ]
        rows = [["Cliente", "Tel.", "Saldo", "Estado", "Vence"]]
        for r in data["rows"]:
            rows.append(
                [
                    r["cliente"],
                    r["telefono"],
                    fmt_cop(r["saldo"]),
                    r["estado"],
                    fmt_date(r["vence"]),
                ]
            )
        if len(rows) == 1:
            rows.append(["Sin saldos pendientes", "—", "—", "—", "—"])
        story.append(self._table(rows, [2.1 * inch, 1.0 * inch, 1.0 * inch, 0.85 * inch, 0.85 * inch]))
        return self._build_doc(story, title="Clientes deudores", subtitle="Créditos con saldo pendiente")

    def overdue(self) -> bytes:
        data = self.service.overdue_debtors(self.user)
        story = [
            self._kpi_row([("Cuentas vencidas", str(data["count"])), ("Monto vencido", fmt_cop(data["total_debt"]))]),
            Spacer(1, 10),
        ]
        rows = [["Cliente", "Tel.", "Saldo", "Vence"]]
        for r in data["rows"]:
            rows.append(
                [
                    r["cliente"],
                    r["telefono"],
                    fmt_cop(r["saldo"]),
                    fmt_date(r["vence"]),
                ]
            )
        if len(rows) == 1:
            rows.append(["No hay fiados vencidos", "—", "—", "—"])
        story.append(self._table(rows, [2.4 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch]))
        return self._build_doc(story, title="Fiados vencidos", subtitle="Prioridad de cobro")

    def sales_daily(self, day: date) -> bytes:
        data = self.service.sales_daily(self.user, day)
        story = [
            self._kpi_row(
                [
                    ("Líneas de venta", str(data["ticket_count"])),
                    ("Unidades", str(data["units"])),
                    ("Total", fmt_cop(data["total"])),
                ]
            ),
            Spacer(1, 10),
            Paragraph("Detalle POS", self.h2),
        ]
        rows = [["Hora", "Producto", "Cant.", "Valor", "Nota"]]
        for line in data["lines"][:200]:
            rows.append(
                [
                    line["when"].astimezone(BOGOTA).strftime("%H:%M"),
                    (line["producto"] or "")[:28],
                    str(line["qty"]),
                    fmt_cop(line["valor"]),
                    (line["nota"] or "")[:36],
                ]
            )
        if len(rows) == 1:
            rows.append(["—", "Sin ventas este día", "—", "—", "—"])
        story.append(self._table(rows, [0.6 * inch, 2.2 * inch, 0.55 * inch, 0.85 * inch, 1.6 * inch]))
        return self._build_doc(story, title="Ventas del día", subtitle=fmt_date(day))

    def sales_monthly(self, year: int, month: int) -> bytes:
        data = self.service.sales_monthly(self.user, year, month)
        story = [
            self._kpi_row(
                [
                    ("Líneas del mes", str(data["ticket_count"])),
                    ("Unidades", str(data["units"])),
                    ("Total mes", fmt_cop(data["total"])),
                ]
            ),
            Spacer(1, 10),
            Paragraph("Ventas por día", self.h2),
        ]
        rows = [["Fecha", "Tickets", "Unidades", "Total"]]
        for d in data["daily"]:
            rows.append([d["fecha"], str(d["tickets"]), str(d["unidades"]), fmt_cop(d["total"])])
        if len(rows) == 1:
            rows.append(["—", "0", "0", fmt_cop(0)])
        story.append(self._table(rows, [1.2 * inch, 1.0 * inch, 1.0 * inch, 1.2 * inch]))
        return self._build_doc(
            story,
            title="Ventas del mes",
            subtitle=f"{month:02d}/{year}",
        )

    def top_products(self, start: date, end: date, limit: int) -> bytes:
        from app.core.report_utils import day_bounds_bogota

        s, _ = day_bounds_bogota(start)
        _, e = day_bounds_bogota(end)
        data = self.service.top_products(self.user, s, e, limit=limit)
        story = [Paragraph(f"Período {fmt_date(start)} – {fmt_date(end)}", self.body), Spacer(1, 8)]
        rows = [["Producto", "SKU", "Unidades", "Ingresos est."]]
        for r in data["rows"]:
            rows.append([r["nombre"][:32], r["sku"][:14], str(r["unidades"]), fmt_cop(r["ingresos"])])
        if len(rows) == 1:
            rows.append(["Sin ventas en el período", "—", "—", "—"])
        story.append(self._table(rows, [2.5 * inch, 1.1 * inch, 0.9 * inch, 1.0 * inch]))
        return self._build_doc(story, title="Productos más vendidos", subtitle="Ventas POS")

    def low_stock(self) -> bytes:
        data = self.service.low_stock(self.user)
        story = [
            self._kpi_row([("Referencias en alerta", str(data["count"]))]),
            Spacer(1, 10),
        ]
        rows = [["Producto", "SKU", "Stock", "Mínimo", "Estado"]]
        for r in data["rows"]:
            rows.append([r["producto"][:30], r["sku"][:12], str(r["stock"]), str(r["minimo"]), r["estado"]])
        if len(rows) == 1:
            rows.append(["Todo en norma", "—", "—", "—", "—"])
        story.append(self._table(rows, [2.3 * inch, 1.0 * inch, 0.7 * inch, 0.7 * inch, 0.8 * inch]))
        return self._build_doc(story, title="Stock bajo", subtitle="Reposición sugerida")

    def inventory_valuation(self) -> bytes:
        data = self.service.inventory_valuation(self.user)
        story = [
            self._kpi_row(
                [
                    ("Valor total", fmt_cop(data["total_value"])),
                    ("Unidades", str(data["total_units"])),
                    ("SKU activos", str(data["sku_count"])),
                ]
            ),
            Spacer(1, 10),
            Paragraph("Por contexto", self.h2),
        ]
        rows = [["Contexto", "Productos", "Unidades", "Valor"]]
        for r in data["contexts"]:
            rows.append([r["contexto"], str(r["productos"]), str(r["unidades"]), fmt_cop(r["valor"])])
        story.append(self._table(rows, [1.4 * inch, 1.0 * inch, 1.0 * inch, 1.2 * inch]))
        story += [Spacer(1, 10), Paragraph("Top por valor en inventario", self.h2)]
        rows2 = [["Producto", "Stock", "Precio", "Valor"]]
        for r in data["top_products"][:25]:
            rows2.append([r["producto"][:32], str(r["stock"]), fmt_cop(r["precio"]), fmt_cop(r["valor"])])
        story.append(self._table(rows2, [2.6 * inch, 0.7 * inch, 0.9 * inch, 1.0 * inch]))
        return self._build_doc(story, title="Inventario valorizado", subtitle="Productos activos")

    def movements_summary(self, start: date, end: date) -> bytes:
        from app.core.report_utils import day_bounds_bogota

        s, _ = day_bounds_bogota(start)
        _, e = day_bounds_bogota(end)
        data = self.service.movements_summary(self.user, s, e)
        story = [
            Paragraph(f"Período {fmt_date(start)} – {fmt_date(end)}", self.body),
            Spacer(1, 8),
            self._kpi_row(
                [
                    ("Ventas POS", fmt_cop(data["pos_total"])),
                    ("Tickets POS", str(data["pos_tickets"])),
                    ("Entradas", str(data["counts"]["in"])),
                    ("Salidas", str(data["counts"]["out"])),
                ]
            ),
            Spacer(1, 10),
            Paragraph("Unidades movidas", self.h2),
        ]
        rows = [["Tipo", "Movimientos", "Unidades"]]
        labels = {"in": "Entrada", "out": "Salida", "adjust": "Ajuste"}
        for key in ("in", "out", "adjust"):
            rows.append([labels[key], str(data["counts"][key]), str(data["units"][key])])
        story.append(self._table(rows, [2.0 * inch, 1.5 * inch, 1.5 * inch]))
        return self._build_doc(story, title="Resumen de movimientos", subtitle="Inventario y ventas")
