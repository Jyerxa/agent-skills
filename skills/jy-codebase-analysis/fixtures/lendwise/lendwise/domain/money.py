"""Money value object. All monetary amounts are Decimal, rounded to cents half-even."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal

CENT = Decimal("0.01")


@dataclass(frozen=True, order=True)
class Money:
    amount: Decimal
    currency: str = "USD"

    @classmethod
    def of(cls, value, currency: str = "USD") -> Money:
        return cls(Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_EVEN), currency)

    @classmethod
    def zero(cls) -> Money:
        return cls.of(0)

    def __add__(self, other: Money) -> Money:
        self._same_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: Money) -> Money:
        self._same_currency(other)
        return Money(self.amount - other.amount, self.currency)

    def is_zero(self) -> bool:
        return self.amount == 0

    def _same_currency(self, other: Money) -> None:
        if other.currency != self.currency:
            raise ValueError(f"Currency mismatch: {self.currency} vs {other.currency}")
