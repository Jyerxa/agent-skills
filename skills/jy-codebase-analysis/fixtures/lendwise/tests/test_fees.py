from datetime import date
from decimal import Decimal

from lendwise.domain.fees import LateFeePolicy
from lendwise.domain.loan import Loan, LoanStatus
from lendwise.domain.money import Money


def _loan():
    loan = Loan("L1", "B1", Money.of(10000), Decimal("0.06"), 36, date(2026, 1, 15))
    loan.activate(first_due=date(2026, 2, 15))
    return loan


def test_no_fee_on_day_10_fee_on_day_11():
    policy, loan = LateFeePolicy(), _loan()
    first = loan.schedule[0]
    assert not policy.applies(loan, first, date(2026, 2, 25))
    assert policy.applies(loan, first, date(2026, 2, 26))


def test_minimum_fee_is_15_dollars():
    assert LateFeePolicy().fee_for(Money.of("120.00")) == Money.of("15.00")


def test_fee_is_capped_at_100_dollars():
    assert LateFeePolicy().fee_for(Money.of("2500.00")) == Money.of("100.00")


def test_hardship_loans_are_never_charged():
    policy, loan = LateFeePolicy(), _loan()
    loan.transition_to(LoanStatus.HARDSHIP)
    assert not policy.applies(loan, loan.schedule[0], date(2026, 6, 1))


def test_fee_charged_once_per_installment():
    policy, loan = LateFeePolicy(), _loan()
    loan.late_fees_assessed.add(1)
    assert not policy.applies(loan, loan.schedule[0], date(2026, 6, 1))
