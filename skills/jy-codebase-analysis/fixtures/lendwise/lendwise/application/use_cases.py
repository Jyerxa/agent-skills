from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import uuid4

from lendwise.application.ports import EventPublisher, LoanRepository
from lendwise.config import (
    DEFAULT_DAY_COUNT,
    DELINQUENCY_THRESHOLD_DAYS,
    MAX_APR,
    MAX_TERM_MONTHS,
    MIN_TERM_MONTHS,
)
from lendwise.domain.amortization import add_months
from lendwise.domain.daycount import get_convention
from lendwise.domain.events import (
    LateFeeAssessed,
    LoanBecameDelinquent,
    LoanOriginated,
    PaymentPosted,
)
from lendwise.domain.fees import LateFeePolicyFactory
from lendwise.domain.interest import accrued_interest
from lendwise.domain.loan import Loan, LoanStatus
from lendwise.domain.money import Money
from lendwise.domain.payments import Allocation, allocate_payment


class ValidationError(Exception):
    pass


@dataclass(frozen=True)
class CreateLoanCommand:
    borrower_id: str
    principal: Money
    apr: Decimal
    term_months: int
    originated_on: date


class CreateLoan:
    def __init__(self, loans: LoanRepository, events: EventPublisher):
        self._loans = loans
        self._events = events

    def execute(self, cmd: CreateLoanCommand) -> Loan:
        if cmd.apr <= 0 or cmd.apr > Decimal(str(MAX_APR)):
            raise ValidationError("APR must be greater than 0 and at most 36%")
        if not (MIN_TERM_MONTHS <= cmd.term_months <= MAX_TERM_MONTHS):
            raise ValidationError("Term must be between 6 and 84 months")
        if cmd.principal < Money.of(1000) or cmd.principal > Money.of(50000):
            raise ValidationError("Principal must be between $1,000 and $50,000")

        loan = Loan(
            id=str(uuid4()),
            borrower_id=cmd.borrower_id,
            principal=cmd.principal,
            apr=cmd.apr,
            term_months=cmd.term_months,
            originated_on=cmd.originated_on,
        )
        loan.activate(first_due=add_months(cmd.originated_on, 1))
        self._loans.add(loan)
        self._events.publish(LoanOriginated(loan.id))
        return loan


@dataclass(frozen=True)
class PostPaymentCommand:
    loan_id: str
    amount: Money
    paid_on: date


class PostPayment:
    def __init__(self, loans: LoanRepository, events: EventPublisher):
        self._loans = loans
        self._events = events

    def execute(self, cmd: PostPaymentCommand) -> Allocation:
        loan = self._loans.get(cmd.loan_id)
        if loan.status not in (LoanStatus.ACTIVE, LoanStatus.DELINQUENT, LoanStatus.HARDSHIP):
            raise ValidationError(f"Cannot post payment to a {loan.status.value} loan")

        convention = get_convention(DEFAULT_DAY_COUNT)
        allocation = allocate_payment(loan, cmd.amount, cmd.paid_on, convention)

        loan.fees_outstanding = loan.fees_outstanding - allocation.to_fees
        loan.balance = loan.balance - allocation.to_principal
        loan.interest_paid_through = cmd.paid_on

        due = loan.next_unpaid_installment()
        if due is not None and cmd.amount >= due.payment:
            loan.paid_installments.add(due.number)

        if loan.balance.is_zero():
            loan.transition_to(LoanStatus.PAID_OFF)
        elif loan.status == LoanStatus.DELINQUENT and loan.days_past_due(cmd.paid_on) == 0:
            loan.transition_to(LoanStatus.ACTIVE)

        self._loans.save(loan)
        self._events.publish(PaymentPosted(loan.id, cmd.amount))
        return allocation


class AssessLateFees:
    """Nightly job: charge late fees and move seriously overdue loans to delinquent."""

    def __init__(self, loans: LoanRepository, events: EventPublisher):
        self._loans = loans
        self._events = events

    def execute(self, today: date) -> int:
        policy = LateFeePolicyFactory.create()
        charged = 0
        for loan in self._loans.find_by_status(
            LoanStatus.ACTIVE, LoanStatus.DELINQUENT, LoanStatus.HARDSHIP
        ):
            for inst in loan.schedule:
                if policy.applies(loan, inst, today):
                    fee = policy.fee_for(inst.payment)
                    loan.fees_outstanding = loan.fees_outstanding + fee
                    loan.late_fees_assessed.add(inst.number)
                    self._events.publish(LateFeeAssessed(loan.id, inst.number, fee))
                    charged += 1

            dpd = loan.days_past_due(today)
            if loan.status == LoanStatus.ACTIVE and dpd > DELINQUENCY_THRESHOLD_DAYS:
                loan.transition_to(LoanStatus.DELINQUENT)
                self._events.publish(LoanBecameDelinquent(loan.id, dpd))
            self._loans.save(loan)
        return charged


@dataclass(frozen=True)
class PayoffQuote:
    loan_id: str
    good_through: date
    principal: Money
    interest: Money
    fees: Money
    total: Money


class GetPayoffQuote:
    def __init__(self, loans: LoanRepository):
        self._loans = loans

    def execute(self, loan_id: str, good_through: date) -> PayoffQuote:
        loan = self._loans.get(loan_id)
        interest = accrued_interest(
            loan.balance,
            loan.apr,
            loan.interest_paid_through,
            good_through,
            get_convention(DEFAULT_DAY_COUNT),
        )
        total = loan.balance + interest + loan.fees_outstanding
        return PayoffQuote(loan.id, good_through, loan.balance, interest, loan.fees_outstanding, total)
