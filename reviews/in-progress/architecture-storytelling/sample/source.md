# Fictional expense system
Revision: fictional-v1. User-supplied fixture, not a real architecture.

S1 Objective: reduce reimbursement handling while retaining approval control.
S2 Employee uses a web UI to submit expense amount and receipt to Expense API.
S3 Expense API checks amount positive and receipt present. It rejects an invalid request without saving.
S4 Valid request is saved in Expense Store with Pending status.
S5 Requests above $10,000 require manager approval before payment. Enforcement location is not identified.
S6 A payment adapter calls an external provider after approval. Provider timeout recovery is unspecified.
