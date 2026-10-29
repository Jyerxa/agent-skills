# Compact working model — fictional-v1
Source: source.md, stable paragraph IDs S1–S6. All inputs fictional.

## Actors/components
Employee: submits expense (S2); manager: approves requests >$10,000 (S5).
Web UI: submission interface, runtime/deployment unspecified (S2).
Expense API: receives amount/receipt and validates positive amount + receipt presence; rejects invalid without saving (S2–S3).
Expense Store: holds valid request, Pending (S4); schema/deployment unknown.
Payment adapter: calls external provider after approval (S6); initiation, protocol and saved-state changes unknown.
External provider: call recipient; successful settlement behavior unknown (S6).

## Transfers and rules
T1 Employee → UI → API, amount and receipt. Protocol unknown (S2).
T2 API → Store, valid request / Pending. Follows validation; transport unknown (S3–S4).
R1 amount > 0 AND receipt present; API rejects failure, no save (S3).
R2 amount > $10,000 → manager approval before payment. Enforcement location unknown; exactly $10,000 does not meet this rule, other approval requirements unknown (S5).
T3 adapter → provider after approval. Trigger path from stored request to adapter unknown; no animated edge claiming it (S6).
Provider external status is documented; no security/encryption guarantees inferred.

## Why
Documented objective: reduced handling + approval control (S1).
Inferred rationale: early validation avoids storing invalid submissions (S3); this is interpretation, not supplied design intent. Confirm with design owner.
Inferred rationale: Pending preserves a distinct pre-payment stage (S4); no guarantee that Pending itself enforces approval. Confirm with design owner.
Documented approval purpose: retaining approval control at high-value threshold (S1,S5).
Adapter decoupling rationale unknown (S6), do not claim.

## Story/claim mapping
0 outcome → S1; 1 submit → S2; 2 validation failure → S3; 3 valid/Pending → S4; 4 high-value gate → S5; 5 call after approval → S6; 6 timeout uncertainty → S6; 7 whole system and open gaps → S1–S6.
Narrative order selects failure then valid branch for teaching, NOT a claim that rejected input later succeeds without resubmission. Scenes 3 onward use a separate valid representative request of $12,400 (illustrative amount).
No claim of approval UI, enforcement component, retry, idempotency, webhook, reconciliation, payment success or state change.
