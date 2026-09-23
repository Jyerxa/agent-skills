"""Level-payment amortization schedules."""
import calendar
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from lendwise.domain.money import Money


@dataclass(frozen=True)
class Installment:
    number: int
    due_date: date
    payment: Money
    interest: Money
    principal: Money
    balance_after: Money


def monthly_payment(principal: Money, apr: Decimal, term_months: int) -> Money:
    r = apr / Decimal(12)
    if r == 0:
        return Money.of(principal.amount / term_months)
    factor = (1 + r) ** term_months
    return Money.of(principal.amount * r * factor / (factor - 1))


def build_schedule(principal: Money, apr: Decimal, term_months: int, first_due: date) -> list[Installment]:
    payment = monthly_payment(principal, apr, term_months)
    r = apr / Decimal(12)
    balance = principal
    schedule = []
    for n in range(1, term_months + 1):
        interest = Money.of(balance.amount * r)
        if n == term_months:
            # last installment pays off whatever is left, absorbing rounding differences
            principal_part = balance
            amount_due = principal_part + interest
        else:
            principal_part = payment - interest
            amount_due = payment
        balance = balance - principal_part
        schedule.append(
            Installment(n, add_months(first_due, n - 1), amount_due, interest, principal_part, balance)
        )
    return schedule


def add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)
