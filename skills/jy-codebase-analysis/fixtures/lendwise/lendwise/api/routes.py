from datetime import date
from decimal import Decimal

from flask import Blueprint, current_app, jsonify, request

from lendwise.application.use_cases import (
    CreateLoanCommand,
    PostPaymentCommand,
    ValidationError,
)
from lendwise.domain.fees import LateFeePolicy
from lendwise.domain.money import Money

bp = Blueprint("loans", __name__)


def _use_case(name: str):
    return current_app.extensions["lendwise"][name]


@bp.post("/loans")
def create_loan():
    body = request.get_json()
    try:
        loan = _use_case("create_loan").execute(
            CreateLoanCommand(
                borrower_id=body["borrower_id"],
                principal=Money.of(body["principal"]),
                apr=Decimal(str(body["apr"])),
                term_months=int(body["term_months"]),
                originated_on=date.fromisoformat(body["originated_on"]),
            )
        )
    except ValidationError as e:
        return jsonify(error=str(e)), 422
    return jsonify(id=loan.id, monthly_payment=str(loan.schedule[0].payment.amount)), 201


@bp.post("/loans/<loan_id>/payments")
def post_payment(loan_id: str):
    body = request.get_json()
    try:
        allocation = _use_case("post_payment").execute(
            PostPaymentCommand(loan_id, Money.of(body["amount"]), date.fromisoformat(body["paid_on"]))
        )
    except ValidationError as e:
        return jsonify(error=str(e)), 422
    return jsonify(
        fees=str(allocation.to_fees.amount),
        interest=str(allocation.to_interest.amount),
        principal=str(allocation.to_principal.amount),
        refund=str(allocation.unapplied.amount),
    )


@bp.get("/loans/<loan_id>/payoff")
def payoff_quote(loan_id: str):
    good_through = date.fromisoformat(request.args.get("date", date.today().isoformat()))
    quote = _use_case("payoff_quote").execute(loan_id, good_through)
    return jsonify(total=str(quote.total.amount), good_through=quote.good_through.isoformat())


@bp.get("/late-fee-preview")
def late_fee_preview():
    """Shows borrowers what a late fee would be for a given installment amount."""
    amount = Money.of(request.args["installment"])
    fee = LateFeePolicy().fee_for(amount)
    return jsonify(fee=str(fee.amount))
