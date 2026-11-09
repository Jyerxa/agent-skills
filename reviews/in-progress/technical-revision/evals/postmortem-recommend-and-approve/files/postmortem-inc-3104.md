# INC-3104 Postmortem

## Lessons Learned

We learned a lot from this incident. Going forward, the team is committed to being more careful, and the future looks bright for the reliability of the search service.

## Timeline

- 09:12 PT: Sam ran the reindex job against the production cluster instead of staging.
- 16:20 UTC: Search latency alerts fired (p99 above 2 s).
- 09:31 PT: On-call (Priya) paged the search team.
- 17:02 UTC: Reindex job stopped; latency began recovering.
- 10:15 PT: Latency back to normal.

## Root Cause

The confirmed root cause is that Sam broke production by running the reindex job against the wrong cluster. The job's config defaulted to production when the `--cluster` flag was omitted.

## Impact

Search p99 latency was above 2 seconds for about 63 minutes. Roughly 18% of search requests timed out during that window, according to the search dashboard.

## Action Items

- Make `--cluster` a required flag on the reindex job. Owner: Sam
- Add a confirmation prompt before any production reindex.
- Alert on reindex jobs started outside the maintenance window.

## Notes

Repro of the default-to-production behavior is still pending; Priya is checking whether the config default or a stale environment variable selected production.

## Summary

On March 3, a reindex job ran against the production search cluster, raising search latency for about an hour until the job was stopped.
