# Edge cache invalidation

## Background

At this point in time, the edge cache is invalidated by a nightly batch job. There are a number of customers who have complained that stale prices remain visible for up to 24 hours. One customer wrote: "We changed a price at 9 a.m. and our shoppers still saw the old one at dinner."

## Requirements

This section uses MUST and SHALL as defined in RFC 2119.

- The publisher MUST emit an invalidation event within 5 seconds of a price change.
- Edge nodes SHALL apply an invalidation within 30 seconds of receiving it.
- The system MUST NOT invalidate more than 10,000 keys per second per region.

## Proposal

We propose to make a change to the publisher so that it performs the validation of each price update and then makes a determination about which cache keys are affected. It is our intention to emit one `invalidate` event per affected key to the `cache-events` topic. The cache invalidation event propagation latency budget is 30 seconds end to end. This design is very unique among our services, in that it is the first one that is basically fully event-driven.

Edge nodes shall/should acknowledge each event. Logs are written to stdout and/or a file, depending on the `log_target` setting, which accepts `stdout`, `file`, or `both`.

## Alternatives

Each and every alternative we considered was rejected. Shortening the batch interval to 15 minutes was rejected due to the fact that it would increase origin load by roughly 40%. Using a TTL of 60 seconds was rejected in order to avoid a cache hit rate drop of an estimated 25%.
