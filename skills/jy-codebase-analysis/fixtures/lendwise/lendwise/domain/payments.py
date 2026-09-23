from dataclasses import dataclass
from datetime import date

from lendwise.domain.daycount import DayCountConvention
from lendwise.domain.interest import accrued_interest
from lendwise.domain.loan import Loan
from lendwise.domain.money import Money


@dataclass(frozen=True)
class Allocation:
    to_fees: Money
    to_interest: Money
    to_principal: Money
    unapplied: Money


def allocate_payment(
    loan: Loan, amount: Money, paid_on: date, convention: DayCountConvention
) -> Allocation:
    """Apply a payment: outstanding fees first, then accrued interest, then principal.

    Anything beyond the full balance is returned as unapplied (refunded to the borrower).
    Extra principal is allowed at any time with no prepayment penalty.
    """
    remaining = amount

    to_fees = min(remaining, loan.fees_outstanding)
    remaining = remaining - to_fees

    interest_due = accrued_interest(
        loan.balance, loan.apr, loan.interest_paid_through, paid_on, convention
    )
    to_interest = min(remaining, interest_due)
    remaining = remaining - to_interest

    to_principal = min(remaining, loan.balance)
    remaining = remaining - to_principal

    return Allocation(to_fees, to_interest, to_principal, unapplied=remaining)
