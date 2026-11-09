---
type: llm
focus: trace
weight: 1
---

The runbook includes a rollback that uses `keyctl revert --env <env> --to <previous key ID>` and says it works only while the previous key is still in its grace window.
