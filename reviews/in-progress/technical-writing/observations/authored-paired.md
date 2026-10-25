# Send Relay events and handle retries

Send a JSON event to `POST https://relay.example/events` with a bearer token and an idempotency key. Relay returns HTTP `202` after storing the event. A timeout can occur after storage, so a timeout does not establish that the event was lost.

## Prepare and send the request

1. Make your token available through the `RELAY_TOKEN` variable.
2. Generate one idempotency key for each logical event. Retain that key and the event body for retries. The supplied documentation does not specify how to generate keys.
3. Send the event with the `Authorization`, `Idempotency-Key`, and `Content-Type` headers shown below.

This example uses the sample key `demo-41` for the sample event. Use a separate key for each new logical event; do not reuse `demo-41` for every event.

```sh
curl -X POST https://relay.example/events \
  -H "Authorization: Bearer $RELAY_TOKEN" \
  -H "Idempotency-Key: demo-41" \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice.created","invoice_id":"inv_41"}'
```

This command sends one request. It does not perform the retries described below automatically; no client retry library is in scope.

## Decide whether to retry

For 24 hours after the first accepted request, Relay deduplicates requests that use the same key and an identical body. A retry within those conditions returns the original receipt. Keep both the key and body unchanged when retrying, including after a timeout.

Before each retry, check both limits:

- Allow at most **3 total attempts**, including the first request. This permits at most two retries. On exhaustion, stop and reconcile the event with your records.
- Do not retry automatically after the 24-hour deduplication window. The guarantee has expired; reconcile the event with your records first. A required wait does not extend that window.

Within those limits, handle each result as follows:

| Result | Action |
| --- | --- |
| HTTP `202` | The event is stored. Stop retrying. |
| HTTP `429` | Read `Retry-After`, which is in seconds. Wait for that interval before retrying with the same key and identical body. |
| HTTP `503` or a network timeout | Wait at least 2 seconds before retrying with the same key and identical body. |
| HTTP `409` | Investigate the mismatch between the body and the body previously sent with that key. Do not change the key merely to bypass the conflict. |
| HTTP `401` or `403` | Fix authentication or permissions. Do not automatically retry. |
| Any other error | Stop and investigate. |

Check the attempt count and deduplication window again after waiting, before sending another request.

## Reconcile unresolved events

Use your records to reconcile unresolved events; there is no documented status lookup endpoint. An exhausted sequence that includes a timeout does not establish that Relay failed to store the event.

HTTP `202` confirms storage. The documented behavior does not establish exactly-once downstream processing or any latency guarantee.
