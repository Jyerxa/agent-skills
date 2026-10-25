# Relay retry limits

Relay stores an event before returning HTTP 202. A timeout can occur after storage,
so the client may not know whether a request succeeded.

Within 24 hours of the first accepted request, Relay deduplicates retries with
the same Idempotency-Key and identical body. That guarantee does not establish
exactly-once downstream processing.

| Result | Action |
| --- | --- |
| HTTP 429 | Wait for Retry-After, expressed in seconds. |
| HTTP 503 or timeout | Wait at least 2 seconds. |
| HTTP 409 | Investigate a body mismatch; do not change the key to bypass it. |
| HTTP 401 or 403 | Fix authentication or permissions; do not automatically retry. |
| Other errors | Stop and investigate. |

Allow at most 3 total attempts, including the first. When the attempts are exhausted
or the 24-hour window has expired, stop automatic retries and reconcile with your
records.
