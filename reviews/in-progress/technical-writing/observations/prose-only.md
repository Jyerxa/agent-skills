# Retrying Relay requests

## Background

Relay is an event API. The client should use an Idempotency-Key header to
support retries.

## Sending requests

Relay stores the event before returning HTTP 202. A timeout can occur after
storage, so the request may have succeeded even if the client saw a timeout.

For HTTP 503 or a connection timeout, wait at least 2 seconds, then retry with
the same key and identical body. For HTTP 429, wait for the Retry-After interval
in seconds. Allow no more than 3 total attempts, including the first. After the
last attempt, stop and reconcile with your records.

## Additional considerations

Deduplication lasts 24 hours after the first accepted request. After that window,
do not retry automatically; reconcile with your records first. HTTP 409 means
the same key was used with a different body. Investigate the mismatch rather than
changing the key to bypass the conflict. For HTTP 401 or 403, fix authentication
or permissions instead of automatically retrying. For other errors, stop and
investigate.

## Diagnostic examples

The following literals are test data, not editorial claims:

```json
{"load-bearing": true, "message": "honestly, genuinely, that matter"}
```

The fixture author supplied this exact quotation: "Honestly, this is genuinely
load-bearing for the workflows that matter."

No latency guarantee is specified. The source does not establish exactly-once
downstream processing. Keep those limitations when editing this draft.
