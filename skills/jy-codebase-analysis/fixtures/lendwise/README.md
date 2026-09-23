# Lendwise

Lendwise services consumer installment loans: origination, monthly payment
schedules, payment posting, late fees, payoff quotes, and portfolio reporting.

## Interest

Interest accrues daily on an actual/365 basis.

## Late fees

A late fee of 5% of the missed payment is charged once an installment is more
than 10 days late.

## Running

    pip install -e .
    flask --app lendwise.app run
