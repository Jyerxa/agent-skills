"""Publishes delinquency events to the external collections system (protobuf over HTTP)."""
import urllib.request

from lendwise._generated import loan_pb2
from lendwise.domain.events import LoanBecameDelinquent


class CollectionsGateway:
    def __init__(self, endpoint: str, loans):
        self._endpoint = endpoint
        self._loans = loans

    def on_delinquent(self, event: LoanBecameDelinquent) -> None:
        loan = self._loans.get(event.loan_id)
        message = loan_pb2.LoanDelinquent(
            loan_id=loan.id,
            borrower_id=loan.borrower_id,
            days_past_due=event.days_past_due,
            balance=str(loan.balance.amount),
        )
        request = urllib.request.Request(
            self._endpoint,
            data=message.SerializeToString(),
            headers={"Content-Type": "application/x-protobuf"},
            method="POST",
        )
        urllib.request.urlopen(request, timeout=5)
