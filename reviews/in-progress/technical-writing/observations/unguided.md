Send a Relay event with `POST https://relay.example/events`, a JSON body, and an `Authorization: Bearer <token>` header. Every request also requires an `Idempotency-Key` header. Generate one key for each logical event, then retain that key and the event body for retries. Relay does not specify how to generate keys.

Use the following request to send the sample `invoice.created` event. Supply your token through `RELAY_TOKEN`; keep production tokens out of documentation. The key `demo-41` belongs to this example. Generate a separate key for each new logical event.

```sh
curl -X POST https://relay.example/events \
  -H "Authorization: Bearer $RELAY_TOKEN" \
  -H "Idempotency-Key: demo-41" \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice.created","invoice_id":"inv_41"}'
```

Relay returns HTTP `202` after storing the event. A network timeout can occur after storage, so a timeout does not tell you whether the event was lost. When retrying, send the same key and identical body.

For 24 hours after the first accepted request, Relay deduplicates requests that have the same key and identical body. A retry within that window returns the original receipt. This guarantee does not establish exactly-once downstream processing or any latency guarantee.

Apply these rules to the response or failure from each attempt:

| Result | Action |
| --- | --- |
| HTTP `202` | The event has been stored. Stop retrying. |
| HTTP `429` | Read `Retry-After`, which is expressed in seconds. Wait for that interval before retrying. |
| HTTP `503` | Wait at least 2 seconds before retrying. |
| Network timeout | Wait at least 2 seconds before retrying. The event may already have been stored. |
| HTTP `409` | Investigate the mismatch between bodies sent with the same key. Do not change the key merely to bypass the conflict. |
| HTTP `401` or `403` | Fix authentication or permissions. Do not automatically retry. |
| Any other error | Stop and investigate. |

Limit delivery to **3 total attempts**, including the first request. This allows at most two retries. The retryable results above do not override that limit: after the third attempt, stop and reconcile the event with your records if delivery remains unresolved.

Also respect the deduplication window. After 24 hours from the first accepted request, the deduplication guarantee expires. Do not retry automatically after that window, even if attempts remain. Reconcile the event with your records first. There is no documented status lookup endpoint.

The `curl` example sends one request and does not perform these retries automatically. Your calling code or manual workflow must enforce the wait intervals, retain the original key and identical body, count attempts, and stop when either the attempt limit or deduplication window prevents another automatic retry.
