from dataclasses import dataclass


@dataclass
class ReceiptJob:
    receipt_id: str
    text: str
    sent: bool = False


def send_email(job, gateway):
    if job.sent:
        return
    gateway.send(job.receipt_id, job.text)
    job.sent = True


def send_sms(job, gateway):
    if job.sent:
        return
    gateway.send(job.receipt_id, job.text, idempotency_key=job.receipt_id)
    job.sent = True
