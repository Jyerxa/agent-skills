import smtplib
from email.message import EmailMessage

from lendwise.domain.events import LateFeeAssessed


class EmailNotifier:
    def __init__(self, smtp_host: str, sender: str):
        self._smtp_host = smtp_host
        self._sender = sender

    def on_late_fee(self, event: LateFeeAssessed) -> None:
        msg = EmailMessage()
        msg["From"] = self._sender
        msg["To"] = f"borrower+{event.loan_id}@lendwise.example"
        msg["Subject"] = "A late fee was added to your loan"
        msg.set_content(
            f"A late fee of ${event.fee.amount} was charged for installment "
            f"#{event.installment_number}."
        )
        with smtplib.SMTP(self._smtp_host) as smtp:
            smtp.send_message(msg)
