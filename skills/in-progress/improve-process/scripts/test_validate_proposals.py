"""Structural/provenance regression checks; actual advice needs an evidence review."""

import hashlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from validate_proposals import validate

BASELINE = b'''---
format: process-model/v1
model_id: donation
revision: 1
mode: ENVISIONED
agreement: draft
coverage: partial
---
# Donation intake

### action-inspect
- Kind: action
- Name: Inspect donation
- Meaning: A coordinator will inspect the item.
- Evidence: reported; intent; [Account](#src-account)

### q-unsafe
- Kind: question
- Name: What about unsafe items?
- Meaning: Unsafe-item handling has not been decided.
- Evidence: unknown; intent; [Account](#src-account)

### src-account
- Kind: source
- Name: Supplied account
- Locator: Fictional test input, donation account.
'''


def proposal(baseline=BASELINE):
    return f'''---
format: process-improvement/v1
assessment_id: donation-options
revision: 1
baseline_format: process-model/v1
baseline_model_id: donation
baseline_revision: 1
baseline_mode: ENVISIONED
baseline_agreement: draft
baseline_coverage: partial
baseline_locator: process.md
baseline_sha256: {hashlib.sha256(baseline).hexdigest()}
---
# Donation assessment

The goal is unspecified in this fictional input. Any operational choice remains conditional.

### proposal-clarify
- Name: Clarify unsafe-item handling before adoption
- Status: needs-evidence
- Problem: The incomplete intended process leaves unsafe-item handling undecided.
- Basis: [Gap](process.md#q-unsafe), Meaning and Evidence: unknown intent.
- Affects: [Inspection](process.md#action-inspect), [gap](process.md#q-unsafe).
- Diagnosis: A knowledge gap, not an observed incident or established cause.
- Change: Propose a decision conversation; do not adopt a handling rule yet.
- Alternatives: Do nothing, leaving the decision unresolved; pause process adoption pending that decision.
- Tradeoffs: Decision effort is unmeasured; a pause could delay adoption.
- Constraints: Preserve intended coordinator inspection; no policy change authorized.
- Benefit hypothesis: An explicit choice may reduce ambiguity; operational benefit is unproven.
- Test: Review a hypothetical unsafe-item case with an authorized decision-maker once identified.
- Decision: Defer operational changes until the user selects a policy. No implementation is authorized.
'''


class ProposalTests(unittest.TestCase):
    def test_partial_envisioned_and_existing_baselines(self):
        self.assertEqual(validate(proposal(), BASELINE), [])
        existing = BASELINE.replace(b'ENVISIONED', b'EXISTING').replace(b'; intent;', b'; practice;')
        artifact = proposal(existing).replace('baseline_mode: ENVISIONED', 'baseline_mode: EXISTING')
        self.assertEqual(validate(artifact, existing), [])

    def test_detects_changed_bytes_even_with_same_revision(self):
        self.assertTrue(any('sha256' in e for e in validate(proposal(), BASELINE + b'\n')))

    def test_crlf_hash_is_exact_but_parsing_tolerates_crlf(self):
        crlf = BASELINE.replace(b'\n', b'\r\n')
        self.assertEqual(validate(proposal(crlf).replace('\n', '\r\n'), crlf), [])
        self.assertTrue(any('sha256' in e for e in validate(proposal(), crlf)))

    def test_checks_each_metadata_pin(self):
        for key, value in [('format', 'process-model/v9'), ('model_id', 'another'),
                           ('revision', '2'), ('mode', 'EXISTING'),
                           ('agreement', 'user-confirmed'), ('coverage', 'reviewable')]:
            import re
            artifact = re.sub(rf'^baseline_{key}: .+$', f'baseline_{key}: {value}', proposal(), flags=re.M)
            self.assertTrue(any(f'baseline_{key}' in e for e in validate(artifact, BASELINE)))

    def test_rejects_unknown_contract(self):
        self.assertTrue(validate(proposal().replace('process-improvement/v1', 'process-improvement/v2'), BASELINE))
        self.assertTrue(validate(proposal(), BASELINE.replace(b'process-model/v1', b'process-model/v2')))

    def test_rejects_missing_proposal_fields(self):
        artifact = proposal().replace('- Tradeoffs: Decision effort is unmeasured; a pause could delay adoption.\n', '')
        self.assertTrue(any('missing Tradeoffs' in e for e in validate(artifact, BASELINE)))

    def test_rejects_invented_baseline_record(self):
        self.assertTrue(any('Unknown baseline' in e for e in validate(proposal().replace('#q-unsafe', '#q-made-up'), BASELINE)))

    def test_requires_baseline_basis_not_an_unrelated_external_link(self):
        artifact = proposal().replace('[Gap](process.md#q-unsafe)', '[Other](https://example.invalid/#q-unsafe)')
        self.assertTrue(any('Basis needs' in e for e in validate(artifact, BASELINE)))

    def test_affected_ids_cannot_be_sources(self):
        artifact = proposal().replace('- Affects: [Inspection](process.md#action-inspect), [gap](process.md#q-unsafe).',
                                      '- Affects: [Account](process.md#src-account).')
        self.assertTrue(any('Affects needs' in e for e in validate(artifact, BASELINE)))

    def test_duplicate_ids_fields_and_metadata_are_errors(self):
        section = proposal()[proposal().index('### proposal-clarify'):]
        self.assertTrue(any('Duplicate record' in e for e in validate(proposal() + section, BASELINE)))
        self.assertTrue(any('duplicate field' in e for e in validate(proposal() + '- Status: proposed\n', BASELINE)))
        self.assertTrue(any('Duplicate metadata' in e for e in validate(proposal().replace('revision: 1\n', 'revision: 1\nrevision: 2\n', 1), BASELINE)))

    def test_accepted_requires_a_decision_locator_not_just_status(self):
        artifact = proposal().replace('- Status: needs-evidence', '- Status: accepted')
        self.assertTrue(any('Decision evidence' in e for e in validate(artifact, BASELINE)))
        # Structural acceptance of a locator does not establish real authorization.
        self.assertEqual(validate(artifact + '- Decision evidence: Fictional test choice U2.\n', BASELINE), [])

    def test_unknown_status_and_malformed_heading_fail(self):
        self.assertTrue(any('invalid Status' in e for e in validate(proposal().replace('Status: needs-evidence', 'Status: implemented'), BASELINE)))
        self.assertTrue(any('headings' in e for e in validate(proposal().replace('### proposal-clarify', '### Proposed Clarification'), BASELINE)))

    def test_wrapped_fields_and_fenced_examples(self):
        artifact = proposal().replace('- Basis: [Gap]', '- Basis:\n  [Gap]')
        artifact += '\n```markdown\n### proposal-clarify\n- Status: wrong\n```\n'
        self.assertEqual(validate(artifact, BASELINE), [])

    def test_zero_proposals_and_real_local_dependencies(self):
        assessment = proposal().split('### proposal-clarify')[0]
        self.assertEqual(validate(assessment, BASELINE), [])
        artifact = proposal() + '\nSee [decision](#proposal-clarify).\n'
        self.assertEqual(validate(artifact, BASELINE), [])
        self.assertTrue(any('Unknown proposal' in e for e in validate(artifact.replace('](#proposal-clarify)', '](#absent)'), BASELINE)))

    def test_invalid_or_missing_baseline_is_rejected(self):
        self.assertTrue(validate(proposal(), b'not a model'))
        self.assertTrue(validate(proposal(), b'\xff'))
        self.assertTrue(validate(proposal().replace('baseline_locator: process.md', 'baseline_locator: process.md#wrong'), BASELINE))

    def test_standalone_cli_is_read_only(self):
        skill = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(skill / 'scripts', root / 'scripts', ignore=shutil.ignore_patterns('__pycache__'))
            model, artifact = root / 'process.md', root / 'improvements.md'
            model.write_bytes(BASELINE)
            artifact.write_text(proposal(), encoding='utf-8')
            before = (model.read_bytes(), artifact.read_bytes())
            result = subprocess.run([sys.executable, str(root / 'scripts/validate_proposals.py'), str(artifact),
                                     '--baseline', str(model)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(before, (model.read_bytes(), artifact.read_bytes()))
            failed = subprocess.run([sys.executable, str(root / 'scripts/validate_proposals.py'), str(artifact),
                                     '--baseline', str(root / 'missing.md')], capture_output=True)
            self.assertEqual(failed.returncode, 2)

    def test_bundled_contract_and_baseline_validator_are_identical(self):
        skill = Path(__file__).resolve().parents[1]
        capture = skill.parent / 'capture-process'
        if not capture.exists():
            self.skipTest('No sibling installed; this package is standalone.')
        for name in ('references/process-model-v1.md', 'scripts/validate_model.py'):
            self.assertEqual((skill / name).read_bytes(), (capture / name).read_bytes())

    def test_workshop_artifact_against_the_real_capture(self):
        skill = Path(__file__).resolve().parents[1]
        source = skill.parent / 'capture-process/fixtures/workshop-process.md'
        if not source.exists():
            self.skipTest('Repository-only integration fixture; no sibling needed at runtime.')
        artifact = (skill / 'fixtures/workshop-improvements.md').read_text(encoding='utf-8')
        self.assertEqual(validate(artifact, source.read_bytes()), [])


if __name__ == '__main__':
    unittest.main()
