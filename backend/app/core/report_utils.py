from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

BOGOTA = ZoneInfo("America/Bogota")


def fmt_cop(value: float) -> str:
    n = int(round(value or 0))
    return f"${n:,}".replace(",", ".")


def fmt_date(d: date | datetime | None) -> str:
    if d is None:
        return "—"
    if isinstance(d, datetime):
        d = d.astimezone(BOGOTA).date()
    return d.strftime("%d/%m/%Y")


def fmt_datetime(dt: datetime | None) -> str:
    if dt is None:
        return "—"
    return dt.astimezone(BOGOTA).strftime("%d/%m/%Y %H:%M")


def day_bounds_bogota(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=BOGOTA)
    end = start + timedelta(days=1)
    return start, end


def month_bounds_bogota(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=BOGOTA)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=BOGOTA)
    else:
        end = datetime(year, month + 1, 1, tzinfo=BOGOTA)
    return start, end
