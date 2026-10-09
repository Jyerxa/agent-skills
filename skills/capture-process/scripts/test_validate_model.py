"""Focused contract checks; semantic fidelity is tested with interview fixtures."""

import unittest

from validate_model import validate


VALID = """---
format: process-model/v1
model_id: test-process
revision: 1
mode: EXISTING
agreement: draft
coverage: partial
---
# Test process

## Model

### actor-clerk
- Kind: actor
- Name: Clerk
- Meaning: Opens cases.
- Evidence: reported; practice; [Answer A1](#src-a1)

### action-open
- Kind: action
- Name: Open case
- Meaning: A clerk opens a case.
- Evidence: reported; practice; [Answer A1](#src-a1)
- Actor: [Clerk](#actor-clerk)

### rel-owner
- Kind: relationship
- Name: Action responsibility
- Meaning: The clerk performs the action.
- Evidence: reported; practice; [Answer A1](#src-a1)
- From: [Clerk](#actor-clerk)
- To: [Open case](#action-open)
- Relation: performs

## Sources

### src-a1
- Kind: source
- Name: Clerk interview
- Locator: Supplied interview, answer A1.
"""


class ModelValidationTests(unittest.TestCase):
    def test_accepts_valid_partial_model(self):
        self.assertEqual(validate(VALID), [])

    def test_accepts_envisioned_model_without_exhaustive_inventories(self):
        text = VALID.replace("mode: EXISTING", "mode: ENVISIONED").replace(
            "; practice;", "; intent;"
        )
        self.assertEqual(validate(text), [])

    def test_accepts_wrapped_evidence(self):
        text = VALID.replace(
            "- Evidence: reported; practice; [Answer A1](#src-a1)",
            "- Evidence: reported; practice;\n  [Answer A1](#src-a1)",
        )
        self.assertEqual(validate(text), [])

    def test_rejects_unknown_contract_version(self):
        self.assertTrue(validate(VALID.replace("process-model/v1", "process-model/v2")))

    def test_rejects_duplicate_ids(self):
        text = VALID + "\n### actor-clerk\n- Kind: actor\n- Name: Another clerk\n"
        self.assertTrue(any("Duplicate record ID" in e for e in validate(text)))

    def test_rejects_dangling_references(self):
        text = VALID.replace("[Clerk](#actor-clerk)", "[Missing](#actor-missing)")
        self.assertTrue(any("Unresolved record link" in e for e in validate(text)))

    def test_rejects_malformed_record_reference(self):
        text = VALID.replace("[Clerk](#actor-clerk)", "[Clerk](#Actor Clerk)")
        self.assertTrue(any("Invalid record link" in e for e in validate(text)))

    def test_rejects_non_source_evidence(self):
        text = VALID.replace("[Answer A1](#src-a1)", "[Clerk](#actor-clerk)")
        self.assertTrue(any("source record" in e for e in validate(text)))

    def test_rejects_missing_relationship_endpoint(self):
        text = VALID.replace("- To: [Open case](#action-open)\n", "")
        self.assertTrue(any("To needs exactly one" in e for e in validate(text)))

    def test_rejects_source_as_relationship_endpoint(self):
        text = VALID.replace("- To: [Open case](#action-open)", "- To: [Source](#src-a1)")
        self.assertTrue(any("not a source" in e for e in validate(text)))

    def test_unknown_can_remain_without_fabricated_source(self):
        text = VALID + """
### q-owner
- Kind: question
- Name: Who owns follow-up?
- Meaning: Ownership of follow-up has not been established.
- Evidence: unknown; practice; No answer supplied.
"""
        self.assertEqual(validate(text), [])

    def test_invalid_revision_and_claim_label_are_rejected(self):
        text = VALID.replace("revision: 1", "revision: 0").replace("reported; practice;", "certain; fact;")
        errors = validate(text)
        self.assertTrue(any("positive integer" in e for e in errors))
        self.assertTrue(any("Evidence must begin" in e for e in errors))

    def test_code_examples_do_not_create_duplicate_records(self):
        text = VALID + "\n```markdown\n### actor-clerk\n[Missing](#missing)\n```\n"
        self.assertEqual(validate(text), [])


if __name__ == "__main__":
    unittest.main()
