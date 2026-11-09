# Restart webhook workers

**When to use:** the `WebhookQueueBacklog` alert fires, or deliveries are delayed
by more than 10 minutes on the Webhooks dashboard.

**Impact if ignored:** partners stop receiving payment events.

## Before you start

- Access to the `payments-prod` Kubernetes context.

## Steps

1. Check the backlog:

   ```bash
   kubectl --context payments-prod -n webhooks get deploy webhook-sender
   ```

   `READY` should show all replicas, for example `6/6`.

2. Restart the workers:

   ```bash
   kubectl --context payments-prod -n webhooks rollout restart deploy/webhook-sender
   ```

## Verify

The backlog on the Webhooks dashboard falls below 100 within 10 minutes.

## Roll back

A restart has nothing to roll back. If the backlog keeps growing, escalate.

## Escalate

Page the payments on-call through PagerDuty service **Payments Platform**, then
post in #payments-oncall.
