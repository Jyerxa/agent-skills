from datetime import date
from decimal import Decimal

from lendwise.domain.amortization import build_schedule, monthly_payment
from lendwise.domain.money import Money


def test_level_payment():
    assert monthly_payment(Money.of(10000), Decimal("0.06"), 36) == Money.of("304.22")


def test_schedule_pays_to_zero_and_last_installment_absorbs_rounding():
    schedule = build_schedule(Money.of(10000), Decimal("0.06"), 36, date(2026, 2, 15))
    assert schedule[-1].balance_after.is_zero()
    assert schedule[-1].payment != schedule[0].payment


def test_due_dates_clamp_to_month_end():
    schedule = build_schedule(Money.of(10000), Decimal("0.06"), 12, date(2026, 1, 31))
    assert schedule[1].due_date == date(2026, 2, 28)
    assert schedule[2].due_date == date(2026, 3, 31)
