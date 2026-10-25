# Proposal: Evaluate an in-process product-description cache

Evaluate caching product descriptions before deciding whether to adopt it. The proposed option uses a 30-second TTL and a capacity cap that remains to be chosen. The database remains the source of truth, and every request must read inventory counts from the database. The alternative is to keep all reads in the database.

The service has six replicas with separate memory, so each replica would have its own cache. Product records can change at any time, and replicas may return different description versions. The business accepts descriptions up to 30 seconds stale; it does not permit cached inventory counts.

A TTL specifies when an entry expires. It does not synchronize replicas or bound memory. A 30-second TTL alone is insufficient evidence that the implementation meets the staleness requirement: the design must account for when the database value was read, when expiration starts, and whether concurrent requests can insert older values. If LRU eviction is selected, it removes the least recently used entry when capacity is reached; it does not guarantee freshness.

No traffic measurements, product sizes, memory budget, benchmarks, or rollout thresholds are available. Performance benefits and a suitable capacity cap are therefore unproven. Before approval, investigate:

1. **Whether caching addresses a measured problem.** Measure current request latency, database work, and repeated description lookups within 30 seconds on each replica. Determine what database work a description-cache hit would avoid while inventory still requires a database read.
2. **Whether the cache meets the data requirements.** Define and test expiration timing, concurrent updates and fills, and behavior when reads fail. Verify that descriptions stay within the 30-second staleness allowance and inventory always comes from the database.
3. **How much memory each replica can use.** Measure description sizes and cache overhead, establish a memory budget, and choose a capacity cap and eviction policy. An entry-count cap alone needs size evidence to establish its memory cost.
4. **Whether measured results justify adoption.** Compare database-only reads with the proposed cache under representative traffic, including cold caches and expiration bursts. Agree on acceptable latency, database load, memory use, freshness checks, and rollout and rollback thresholds before deployment.

Use these findings to decide whether to approve the cache or retain database-only reads. Adoption, sizing, and rollout remain open decisions.
