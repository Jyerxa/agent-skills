from dataclasses import dataclass

from lendwise.domain.money import Money


@dataclass(frozen=True)
class LoanOriginated:
    loan_id: str


@dataclass(frozen=True)
class PaymentPosted:
    loan_id: str
    amount: Money


@dataclass(frozen=True)
class LateFeeAssessed:
    loan_id: str
    installment_number: int
    fee: Money


@dataclass(frozen=True)
class LoanBecameDelinquent:
    loan_id: str
    days_past_due: int
