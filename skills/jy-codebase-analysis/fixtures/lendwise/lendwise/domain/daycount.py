"""Day count conventions used to turn a date range into a year fraction."""
from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal


class DayCountConvention(ABC):
    code: str

    @abstractmethod
    def year_fraction(self, start: date, end: date) -> Decimal: ...


class Thirty360(DayCountConvention):
    """US 30/360: every month has 30 days, the year has 360."""

    code = "30/360"

    def year_fraction(self, start: date, end: date) -> Decimal:
        d1 = min(start.day, 30)
        d2 = 30 if (end.day == 31 and d1 == 30) else end.day
        days = 360 * (end.year - start.year) + 30 * (end.month - start.month) + (d2 - d1)
        return Decimal(days) / Decimal(360)


class Actual365(DayCountConvention):
    """Actual days elapsed over a fixed 365-day year."""

    code = "ACT/365"

    def year_fraction(self, start: date, end: date) -> Decimal:
        return Decimal((end - start).days) / Decimal(365)


_CONVENTIONS = {c.code: c() for c in (Thirty360, Actual365)}


def get_convention(code: str) -> DayCountConvention:
    try:
        return _CONVENTIONS[code]
    except KeyError:
        raise ValueError(f"Unsupported day count convention: {code}") from None
