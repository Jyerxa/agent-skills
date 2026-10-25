# Send Relay events and handle retries

Send a JSON event to `POST https://relay.example/events` with a bearer token and an idempotency key. Keep the same key and identical body for every retry of that event.

## Prepare and send an event

Set `RELAY_TOKEN` in your environment to your bearer token before running the example. Use these headers:

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer` followed by your token |
| `Idempotency-Key` | A key generated for this logical event |
| `Content-Type` | `application/json` |

Every request requires an idempotency key. Generate one key for each logical event, and retain the key and body for retries. The key generation method is not specified.

This example sends an `invoice.created` event. Use `demo-41` only for this example; generate a key for each new logical event.

```sh
curl -X POST https://relay.example/events \
  -H "Authorization: Bearer $RELAY_TOKEN" \
  -H "Idempotency-Key: demo-41" \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice.created","invoice_id":"inv_41"}'
```

The command sends one request. It does not perform the retries described below automatically; implement those decisions in your client or follow them manually.

## Interpret the result

Relay returns HTTP `202` after storing the event. A network timeout can occur after storage, so a timeout does not establish that the event was lost.

For 24 hours after the first accepted request, Relay deduplicates requests that use the same key and identical body. A retry that meets those conditions returns the original receipt. This guarantee does not establish exactly-once downstream processing or any latency guarantee.

## Decide whether to retry

Allow at most **3 total attempts**, including the first request. If all 3 attempts are exhausted, stop and reconcile the event with your records.

Before each retry, check both the attempt count and the deduplication window. After the 24-hour window expires, do not retry automatically; reconcile the event with your records first. Every retry must keep the original key and identical body.

| Result | Action |
| --- | --- |
| HTTP `202` | The event has been stored. Stop retrying. |
| HTTP `429` | Read `Retry-After`, which is in seconds. Wait for that interval before retrying. |
| HTTP `503` | Wait at least 2 seconds before retrying. |
| Network timeout | Wait at least 2 seconds before retrying. The event may already have been stored. |
| HTTP `409` | Investigate the mismatch between bodies sent with the same key. Do not change the key merely to bypass the conflict. |
| HTTP `401` or `403` | Fix authentication or permissions. Do not automatically retry. |
| Any other error | Stop and investigate. |

If a required wait would take a retry past the 24-hour window, reconcile the event with your records before proceeding. No status lookup endpoint is documented.
