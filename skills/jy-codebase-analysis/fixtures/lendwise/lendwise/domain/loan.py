from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import Enum

from lendwise.domain.amortization import Installment, build_schedule
from lendwise.domain.money import Money


class LoanStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DELINQUENT = "delinquent"
    HARDSHIP = "hardship"
    PAID_OFF = "paid_off"
    CHARGED_OFF = "charged_off"


_ALLOWED_TRANSITIONS = {
    LoanStatus.PENDING: {LoanStatus.ACTIVE},
    LoanStatus.ACTIVE: {LoanStatus.DELINQUENT, LoanStatus.HARDSHIP, LoanStatus.PAID_OFF},
    LoanStatus.DELINQUENT: {
        LoanStatus.ACTIVE,
        LoanStatus.HARDSHIP,
        LoanStatus.PAID_OFF,
        LoanStatus.CHARGED_OFF,
    },
    LoanStatus.HARDSHIP: {LoanStatus.ACTIVE, LoanStatus.CHARGED_OFF},
    LoanStatus.PAID_OFF: set(),
    LoanStatus.CHARGED_OFF: set(),
}


class InvalidTransition(Exception):
    pass


@dataclass
class Loan:
    id: str
    borrower_id: str
    principal: Money
    apr: Decimal
    term_months: int
    originated_on: date
    status: LoanStatus = LoanStatus.PENDING
    balance: Money = field(default_factory=Money.zero)
    fees_outstanding: Money = field(default_factory=Money.zero)
    interest_paid_through: date | None = None
    schedule: list[Installment] = field(default_factory=list)
    paid_installments: set[int] = field(default_factory=set)
    late_fees_assessed: set[int] = field(default_factory=set)

    def transition_to(self, new_status: LoanStatus) -> None:
        if new_status not in _ALLOWED_TRANSITIONS[self.status]:
            raise InvalidTransition(f"{self.status.value} -> {new_status.value}")
        self.status = new_status

    def activate(self, first_due: date) -> None:
        self.schedule = build_schedule(self.principal, self.apr, self.term_months, first_due)
        self.balance = self.principal
        self.interest_paid_through = self.originated_on
        self.transition_to(LoanStatus.ACTIVE)

    def next_unpaid_installment(self) -> Installment | None:
        for inst in self.schedule:
            if inst.number not in self.paid_installments:
                return inst
        return None

    def days_past_due(self, today: date) -> int:
        oldest = self.next_unpaid_installment()
        if oldest is None or oldest.due_date >= today:
            return 0
        return (today - oldest.due_date).days
