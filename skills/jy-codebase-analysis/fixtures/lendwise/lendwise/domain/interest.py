from datetime import date
from decimal import Decimal

from lendwise.domain.daycount import DayCountConvention
from lendwise.domain.money import Money


def accrued_interest(
    balance: Money, apr: Decimal, start: date, end: date, convention: DayCountConvention
) -> Money:
    """Simple (non-compounding) interest on the outstanding principal between two dates."""
    if end <= start:
        return Money.zero()
    fraction = convention.year_fraction(start, end)
    return Money.of(balance.amount * apr * fraction)
