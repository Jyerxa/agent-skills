import json
from datetime import date
from decimal import Decimal

import psycopg

from lendwise.application.ports import LoanRepository
from lendwise.domain.amortization import build_schedule
from lendwise.domain.loan import Loan, LoanStatus
from lendwise.domain.money import Money


class SqlLoanRepository(LoanRepository):
    """Stores loans in PostgreSQL. The schedule is rebuilt from loan terms on load."""

    def __init__(self, dsn: str):
        self._dsn = dsn

    def get(self, loan_id: str) -> Loan:
        with psycopg.connect(self._dsn) as conn:
            row = conn.execute("SELECT data FROM loans WHERE id = %s", (loan_id,)).fetchone()
        if row is None:
            raise KeyError(loan_id)
        return _from_row(row[0])

    def add(self, loan: Loan) -> None:
        with psycopg.connect(self._dsn) as conn:
            conn.execute(
                "INSERT INTO loans (id, status, data) VALUES (%s, %s, %s)",
                (loan.id, loan.status.value, json.dumps(_to_row(loan))),
            )

    def save(self, loan: Loan) -> None:
        with psycopg.connect(self._dsn) as conn:
            conn.execute(
                "UPDATE loans SET status = %s, data = %s WHERE id = %s",
                (loan.status.value, json.dumps(_to_row(loan)), loan.id),
            )

    def find_by_status(self, *statuses: LoanStatus) -> list[Loan]:
        with psycopg.connect(self._dsn) as conn:
            rows = conn.execute(
                "SELECT data FROM loans WHERE status = ANY(%s)", ([s.value for s in statuses],)
            ).fetchall()
        return [_from_row(r[0]) for r in rows]


def _to_row(loan: Loan) -> dict:
    return {
        "id": loan.id,
        "borrower_id": loan.borrower_id,
        "principal": str(loan.principal.amount),
        "apr": str(loan.apr),
        "term_months": loan.term_months,
        "originated_on": loan.originated_on.isoformat(),
        "first_due": loan.schedule[0].due_date.isoformat(),
        "status": loan.status.value,
        "balance": str(loan.balance.amount),
        "fees_outstanding": str(loan.fees_outstanding.amount),
        "interest_paid_through": loan.interest_paid_through.isoformat(),
        "paid_installments": sorted(loan.paid_installments),
        "late_fees_assessed": sorted(loan.late_fees_assessed),
    }


def _from_row(data: dict) -> Loan:
    loan = Loan(
        id=data["id"],
        borrower_id=data["borrower_id"],
        principal=Money.of(data["principal"]),
        apr=Decimal(data["apr"]),
        term_months=data["term_months"],
        originated_on=date.fromisoformat(data["originated_on"]),
        status=LoanStatus(data["status"]),
        balance=Money.of(data["balance"]),
        fees_outstanding=Money.of(data["fees_outstanding"]),
        interest_paid_through=date.fromisoformat(data["interest_paid_through"]),
        paid_installments=set(data["paid_installments"]),
        late_fees_assessed=set(data["late_fees_assessed"]),
    )
    loan.schedule = build_schedule(
        loan.principal, loan.apr, loan.term_months, date.fromisoformat(data["first_due"])
    )
    return loan
