# Proposed revision: Retrying Relay requests

Scope: prose and composition. Mode: recommend-and-approve. No changes have been applied to the source or to `/private/tmp/technical-writing-eval/approved-concise.md`.

1. **Replace “Background” with “Before retrying” and replace its paragraph with the following.** This removes unsupported praise, states the required header, and puts the deduplication limit before the retry instructions. Delete the first two sentences of “Additional considerations,” whose content is included here.

   > Every request needs an `Idempotency-Key` header. Generate one key for each logical event and retain it for retries. Use the same key and identical body for every retry.
   >
   > For 24 hours after the first accepted request, Relay deduplicates requests with the same key and identical body; a retry returns the original receipt. After that window, do not retry automatically. Reconcile the event with your records first.

2. **Rename “Sending requests” to “When to retry.”** Make these two replacements to clarify Relay’s behavior and put the retry condition before the action. Leave the remaining instructions in that section unchanged.

   Replace the first paragraph with:

   > Relay returns HTTP 202 after storing the event. A timeout can occur after storage, so a timeout does not establish that the event was lost.

   Replace the sentence beginning “Retry with the same key” with:

   > If Relay returns HTTP 503 or the connection times out, wait at least 2 seconds before retrying.

3. **Rename “Additional considerations” to “Errors that require intervention.”** After the relocation in item 1, keep its HTTP 409, 401, 403, and other-error instructions unchanged. The heading will identify the section’s purpose.

4. **Move the final paragraph to the end of “Before retrying” and delete its final sentence, “Keep those limitations when editing this draft.”** Retain its first two sentences verbatim. This places the limits beside the deduplication guarantee and removes the instruction addressed to the editor.

The resulting section order is **Before retrying → When to retry → Errors that require intervention → Diagnostic examples**. The JSON literal, the fixture author’s exact quotation, and their introductory text remain unchanged and are omitted from this proposal.

Approval is pending. The revised artifact has not been created.
