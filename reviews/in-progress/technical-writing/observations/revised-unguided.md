# Send an event to Relay

Send a JSON event body with `POST https://relay.example/events`. Every request requires an `Authorization: Bearer <token>` header and an `Idempotency-Key` header.

Generate one key for each logical event, then retain that key and the event body for retries. The source documentation does not specify how to generate keys.

## Send the sample event

Supply your token through `RELAY_TOKEN`; keep production tokens out of documentation. The key `demo-41` belongs to this example. Generate a separate key for each new logical event.

```sh
curl -X POST https://relay.example/events \
  -H "Authorization: Bearer $RELAY_TOKEN" \
  -H "Idempotency-Key: demo-41" \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice.created","invoice_id":"inv_41"}'
```

Relay returns HTTP `202` after storing the event. A network timeout can occur after storage, so a timeout does not establish that the event was lost.

## Handle the result and retry when allowed

For 24 hours after the first accepted request, Relay deduplicates requests with the same key and identical body. A retry within that window returns the original receipt. This guarantee does not establish exactly-once downstream processing or any latency guarantee.

Before retrying, check both limits:

- Allow at most **3 total attempts**, including the first request. After the third attempt, stop and reconcile the event with your records if delivery remains unresolved.
- After 24 hours from the first accepted request, the deduplication guarantee expires. Do not retry automatically after that window, even if attempts remain. Reconcile the event with your records first.

There is no documented status lookup endpoint. Within these limits, apply the following rules to each attempt. Every retry must use the original key and identical body.

| Result | Action |
| --- | --- |
| HTTP `202` | The event has been stored. Stop retrying. |
| HTTP `429` | Read `Retry-After`, which is expressed in seconds. Wait for that interval before retrying. |
| HTTP `503` or network timeout | Wait at least 2 seconds before retrying. After a timeout, the event may already have been stored. |
| HTTP `409` | The same key was used with a different body. Investigate the mismatch. Do not change the key merely to bypass the conflict. |
| HTTP `401` or `403` | Fix authentication or permissions. Do not automatically retry. |
| Any other error | Stop and investigate. |

The `curl` example sends one request and does not perform retries automatically. Your calling code or manual workflow must enforce the wait intervals, retain the original key and identical body, count attempts, and stop when either limit prevents another automatic retry.
