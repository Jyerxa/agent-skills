# Retrying Relay requests

## Prepare for retries

Honestly, the client should utilize an Idempotency-Key header in order to help
with retries.

The event is stored before HTTP 202 is returned by Relay. A timeout can happen
after storage. The request may have succeeded even if the client saw a timeout.

No latency guarantee is specified. The source does not establish exactly-once
downstream processing.

## Retry limits

Deduplication lasts 24 hours after the first accepted request. After that window,
do not retry automatically; reconcile with your records first.

Allow no more than 3 total attempts, including the first. Stop and reconcile
with your records after the last attempt.

## Responses to retry

Retry with the same key and identical body if the response is HTTP 503 or the
connection times out, after waiting at least 2 seconds.

For HTTP 429, wait for the Retry-After interval in seconds.

## Errors to investigate

An HTTP 409 means the same key was used with a different body. Investigate the
mismatch rather than changing the key to bypass the conflict.

For HTTP 401 or 403, fix authentication or permissions instead of automatically
retrying. Stop and investigate other errors.

## Diagnostic examples

The following literals are test data, not editorial claims:

```json
{"load-bearing": true, "message": "honestly, genuinely, that matter"}
```

The fixture author supplied this exact quotation: "Honestly, this is genuinely
load-bearing for the workflows that matter."
