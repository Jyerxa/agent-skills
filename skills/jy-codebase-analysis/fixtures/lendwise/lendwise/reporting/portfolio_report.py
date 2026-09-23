"""Month-end portfolio report for finance."""
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from lendwise.domain.loan import LoanStatus


@dataclass(frozen=True)
class ReportRow:
    loan_id: str
    status: str
    balance: Decimal
    apr: Decimal
    accrued_interest: Decimal


@dataclass(frozen=True)
class PortfolioReport:
    as_of: date
    rows: list[ReportRow]
    total_balance: Decimal
    total_accrued_interest: Decimal
    weighted_average_apr: Decimal


def _accrued(balance: Decimal, apr: Decimal, since: date, as_of: date) -> Decimal:
    days = (as_of - since).days
    return (balance * apr * days / 365).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class PortfolioReportBuilder:
    def __init__(self, loans):
        self._loans = loans
        self._as_of: date | None = None
        self._statuses = {LoanStatus.ACTIVE}
        self._min_balance: Decimal | None = None

    def as_of(self, day: date) -> "PortfolioReportBuilder":
        self._as_of = day
        return self

    def including_delinquent(self) -> "PortfolioReportBuilder":
        self._statuses.add(LoanStatus.DELINQUENT)
        return self

    def with_min_balance(self, amount: Decimal) -> "PortfolioReportBuilder":
        self._min_balance = amount
        return self

    def build(self) -> PortfolioReport:
        if self._as_of is None:
            raise ValueError("as_of date is required")
        rows = []
        for loan in self._loans.find_by_status(*self._statuses):
            bal = loan.balance.amount
            if self._min_balance is not None and bal < self._min_balance:
                continue
            rows.append(
                ReportRow(
                    loan.id,
                    loan.status.value,
                    bal,
                    loan.apr,
                    _accrued(bal, loan.apr, loan.interest_paid_through, self._as_of),
                )
            )
        total_balance = sum((r.balance for r in rows), Decimal(0))
        total_interest = sum((r.accrued_interest for r in rows), Decimal(0))
        waa = (
            (sum(r.balance * r.apr for r in rows) / total_balance).quantize(Decimal("0.0001"))
            if total_balance
            else Decimal(0)
        )
        return PortfolioReport(self._as_of, rows, total_balance, total_interest, waa)
