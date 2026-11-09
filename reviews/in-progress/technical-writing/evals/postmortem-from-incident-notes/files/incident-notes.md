# checkout errors 10/14 - raw notes (pasted from #inc-2291 + my scratch)

**alert** CheckoutErrorRate > 1% fired 21:12 UTC (pagerduty, Tue Oct 14)

---- slack #inc-2291 (times are PT, my slack is set to pacific) ----

2:14 PM  Maya Chen: ack, looking. checkout-api 5xx up a lot, mostly 503s from the payments client
2:19 PM  Maya Chen: payments-db looks fine. connections on checkout-api pods are pegged at 50/50
2:22 PM  Raj Patel: Dan's deploy broke it, that went out right before
2:23 PM  Maya Chen: deploy 4471 went out 2:01 PM, it changed the pool config (max 200 -> 50) along with the retry wrapper. not assuming anything yet
2:31 PM  Maya Chen: rolling back 4471
2:38 PM  Maya Chen: rollback done, error rate dropping
2:47 PM  Maya Chen: back to baseline (<0.1%). keeping incident open while we look
3:05 PM  Raj Patel: rough guess ~3% of checkout requests failed during the window?
3:40 PM  Maya Chen: dashboard says 2.7% of checkout requests returned 5xx between 2:05 and 2:47 PM. ~41k requests total in that window. no data says how many customers retried successfully
4:10 PM  Priya Nair: tried to repro the pool exhaustion in staging w/ 4471 and couldn't yet. staging traffic is way lower though. will try a load test tomorrow
4:12 PM  Maya Chen: so current theory = smaller pool + new retry wrapper retrying on pool timeouts -> retry storm. NOT confirmed

---- my scratch ----

- detection was fine (alert ~11 min after deploy), but nobody got paged until the 2nd alert evaluation — check alert config? (Maya)
- deploy 4471 had no canary step, went to 100% at once
- action items we talked about:
  - add canary stage for checkout-api deploys -> Priya
  - alert on connection pool saturation -> Maya
  - review retry wrapper: no retries on pool timeout -> ??? (nobody took it)
  - load test before pool config changes -> platform team maybe? not decided
- payments team wants to know whether any orders were double charged. Maya checked: no duplicate charges found in the payments ledger for the window
- status: incident resolved for customers, root cause investigation still open
