# Review sample contracts

These are small, independent examples from an internal application. The Python
standard library is sufficient. Review every `.py` file; no hidden callers or
dynamic discovery exist beyond the callers described here.

- `labels.py`: `amount_label` is called by a CLI and must format a non-negative
  integer number of cents as `USD 12.34`. The private classes and stages have
  no other callers, extensions, telemetry, or compatibility commitments. Only
  the public function and its output are stable.
- `checkout.py`: the checkout page and `quote_shipping` implement the same
  shipping policy: free delivery at or above 5,000 cents, otherwise 500 cents.
  The rule changes as one product decision. The view's HTML is stable; it has
  no framework constraints preventing a call to the existing pure function.
  Callers provide validated, non-negative integer subtotals.
- `receipts.py`: a queue retries jobs after `TimeoutError`, including after a
  provider accepted a send but its response was lost. The same receipt ID is
  stable across attempts; separate IDs represent distinct receipts. The
  gateway accepts `send(receipt_id, text, *, idempotency_key=None)` and guarantees
  one delivery per provided idempotency key, even across concurrent requests.
  Without a key it creates a new delivery on every call. Both email and SMS
  use this contract; their job objects are reloaded with `sent=False` when a
  failed attempt is retried. They are separate channels and gateway instances.
- `sound.py`: the vendor adapter is a real external seam. The vendor returns a
  balance in minor currency units, and callers need cents. Page and export
  captions are different product policies that happen to have the same text
  today. `normalize_lines` follows a fixed, ordered wire-format contract:
  trim each line; skip blank lines and whole-line `#` comments; split the first
  `=`; trim key and value; reject missing `=` or empty keys; retain duplicate
  keys and `=` inside values, in input order. `optional_hint` is best-effort:
  an unavailable cache explicitly means no hint, not failure of the request.
- `test_checkout.py`: this test is meant to protect the shipping charge in the
  rendered HTML. Other shipping coverage is not present in this sample.

No benchmark or author-process records are supplied. Do not assume they exist
or were omitted by an author. Use Low / Medium / High severity as in the skill,
and distinguish a maintainability observation from a demonstrated wrong result.
