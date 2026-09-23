from datetime import date
from decimal import Decimal

from lendwise.config import LATE_FEE_GRACE_DAYS
from lendwise.domain.amortization import Installment
from lendwise.domain.loan import Loan, LoanStatus
from lendwise.domain.money import Money

LATE_FEE_RATE = Decimal("0.05")
LATE_FEE_MINIMUM = Money.of("15.00")
LATE_FEE_CAP = Money.of("100.00")


class LateFeePolicy:
    def fee_for(self, installment_amount: Money) -> Money:
        fee = Money.of(installment_amount.amount * LATE_FEE_RATE)
        fee = max(fee, LATE_FEE_MINIMUM)
        return min(fee, LATE_FEE_CAP)

    def is_late(self, due_date: date, today: date) -> bool:
        return (today - due_date).days > LATE_FEE_GRACE_DAYS

    def applies(self, loan: Loan, installment: Installment, today: date) -> bool:
        if loan.status == LoanStatus.HARDSHIP:
            return False
        if installment.number in loan.paid_installments:
            return False
        if installment.number in loan.late_fees_assessed:
            return False
        return self.is_late(installment.due_date, today)


class LateFeePolicyFactory:
    """Factory for late fee policies."""

    @staticmethod
    def create() -> LateFeePolicy:
        return LateFeePolicy()
