"""Interfaces the application layer needs from the outside world."""
from abc import ABC, abstractmethod
from typing import Callable, Protocol

from lendwise.domain.loan import Loan, LoanStatus


class LoanRepository(ABC):
    @abstractmethod
    def get(self, loan_id: str) -> Loan: ...

    @abstractmethod
    def add(self, loan: Loan) -> None: ...

    @abstractmethod
    def save(self, loan: Loan) -> None: ...

    @abstractmethod
    def find_by_status(self, *statuses: LoanStatus) -> list[Loan]: ...


class EventPublisher(Protocol):
    def publish(self, event: object) -> None: ...

    def subscribe(self, event_type: type, handler: Callable[[object], None]) -> None: ...
