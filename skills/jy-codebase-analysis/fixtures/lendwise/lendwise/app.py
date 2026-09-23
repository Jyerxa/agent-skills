"""Composition root: wires infrastructure into use cases and exposes the Flask app."""
from flask import Flask

from lendwise import config
from lendwise.api.routes import bp
from lendwise.application.use_cases import AssessLateFees, CreateLoan, GetPayoffQuote, PostPayment
from lendwise.domain.events import LateFeeAssessed, LoanBecameDelinquent
from lendwise.infrastructure.collections_gateway import CollectionsGateway
from lendwise.infrastructure.event_bus import InProcessEventBus
from lendwise.infrastructure.notifications import EmailNotifier
from lendwise.infrastructure.sql_repository import SqlLoanRepository


def build_container() -> dict:
    loans = SqlLoanRepository(config.DATABASE_URL)
    bus = InProcessEventBus()
    bus.subscribe(LateFeeAssessed, EmailNotifier("smtp.lendwise.internal", "no-reply@lendwise.example").on_late_fee)
    bus.subscribe(
        LoanBecameDelinquent,
        CollectionsGateway("https://collections.partner.example/v1/delinquencies", loans).on_delinquent,
    )
    return {
        "create_loan": CreateLoan(loans, bus),
        "post_payment": PostPayment(loans, bus),
        "assess_late_fees": AssessLateFees(loans, bus),
        "payoff_quote": GetPayoffQuote(loans),
    }


def create_app() -> Flask:
    app = Flask(__name__)
    app.extensions["lendwise"] = build_container()
    app.register_blueprint(bp)

    @app.cli.command("assess-late-fees")
    def assess_late_fees():
        from datetime import date

        count = app.extensions["lendwise"]["assess_late_fees"].execute(date.today())
        print(f"Charged {count} late fees")

    return app
