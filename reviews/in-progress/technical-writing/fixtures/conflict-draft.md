# Retry Relay events

Every request should include an Idempotency-Key header. Relay guarantees
exactly-once downstream processing. After a timeout, use a new key and retry
up to three times. The service will not accept the same event twice.
