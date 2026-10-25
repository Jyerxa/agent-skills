# Relay event API: source facts

This is a fictional service used to evaluate documentation. Treat these facts as
the complete source. Do not contact a service or infer features not listed here.

- The audience is developers who know HTTP but are new to Relay.
- POST https://relay.example/events accepts a JSON event body.
- Authentication uses the Authorization: Bearer <token> header.
- Every request needs an Idempotency-Key header. Generate one key for a logical
  event and retain it for retries. This source does not specify key generation.
- Relay returns HTTP 202 after storing the event. A timeout can occur after
  storage, so a timeout does not establish that the event was lost.
- For 24 hours after the first accepted request, Relay deduplicates requests
  with the same key and identical body. The retry returns the original receipt.
- Reusing a key with a different body returns HTTP 409. Investigate the mismatch;
  do not change the key merely to bypass the conflict.
- After 24 hours the deduplication guarantee expires. Do not retry automatically
  after that window; reconcile the event with your records first.
- HTTP 429 includes Retry-After in seconds. Wait for that interval before retrying.
- For HTTP 503 or a network timeout, wait at least 2 seconds before retrying.
- Allow at most 3 total attempts, including the first. On exhaustion, stop and
  reconcile with your records. There is no documented status lookup endpoint.
- For HTTP 401 or 403, fix authentication or permissions; do not automatically retry.
- For all other errors, stop and investigate. There is no client retry library in
  scope; examples using curl do not perform these retries automatically.
- These facts do not establish exactly-once downstream processing or any latency
  guarantee. Documentation must not invent either claim.
- The sample body is {"type":"invoice.created","invoice_id":"inv_41"}.
- The sample key is demo-41. Do not imply that it is suitable for every new event.
- A production token must not appear in the document. Use the variable RELAY_TOKEN.

Example request (preserve the method, URL, headers, and body when reproducing it):

```sh
curl -X POST https://relay.example/events \
  -H "Authorization: Bearer $RELAY_TOKEN" \
  -H "Idempotency-Key: demo-41" \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice.created","invoice_id":"inv_41"}'
```
