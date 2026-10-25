# Product-description cache proposal brief

Write a short design proposal for backend engineers deciding whether to add an
in-process cache to a product-catalog lookup service. Help the reader decide what
to investigate before approval.

- The database is the source of truth.
- Six service replicas have separate memory. An in-process cache is not shared.
- Product records can change at any time.
- The business accepts product descriptions up to 30 seconds stale. Inventory
  counts must come from the database on every request.
- No traffic measurements, product sizes, memory budget, benchmarks, or rollout
  thresholds are available.
- A TTL specifies when an entry expires. It does not synchronize replicas or
  bound memory.
- LRU eviction removes the least recently used entry when capacity is reached.
  It does not guarantee freshness.
- The proposed option caches descriptions with a 30-second TTL and a capacity
  cap yet to be chosen. It does not cache inventory.
- The alternative keeps all reads in the database.

Do not invent performance benefits, implementation guarantees, sizing numbers,
or approved decisions. No questions.
