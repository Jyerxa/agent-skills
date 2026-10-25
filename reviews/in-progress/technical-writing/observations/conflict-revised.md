# Retry Relay events

Every request must include an `Idempotency-Key` header. Generate one key for each
logical event, and retain both the key and the JSON body for retries. Retry the
same event with the same key and an identical body.

Relay returns HTTP 202 after storing an event. A network timeout can occur after
storage, so it does not establish that the event was lost. For 24 hours after the
first accepted request, Relay deduplicates requests with the same key and identical
body and returns the original receipt. This does not establish exactly-once
downstream processing.

Allow at most 3 total attempts, including the first request. Before retrying, apply
the following rules:

| Result | Action |
| --- | --- |
| HTTP 429 | Wait for the interval in the `Retry-After` header, in seconds, before retrying. |
| HTTP 503 or a network timeout | Wait at least 2 seconds before retrying. |
| HTTP 409 | Investigate the mismatch between the bodies sent with the same key. Do not change the key merely to bypass the conflict. |
| HTTP 401 or 403 | Fix authentication or permissions. Do not retry automatically. |
| Any other error | Stop and investigate. |

When all 3 attempts are exhausted, stop and reconcile the event with your records.
After the 24-hour deduplication window expires, do not retry automatically;
reconcile the event with your records first. Relay has no documented status lookup
endpoint.
