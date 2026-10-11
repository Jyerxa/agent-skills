"""Structural and provenance checks; browser and semantic reviews are separate."""
import hashlib
import json
import re
import tempfile
import unittest
from pathlib import Path
from render_process import build_data, default_view, parse_model, render, validate_view

MODEL = '''---
format: process-model/v1
model_id: test-process
revision: 1
mode: EXISTING
agreement: draft
coverage: partial
---
# A small captured process

The relative order of checks is unknown.

### action-check
- Kind: action
- Name: Check the item
- Meaning: A clerk checks the item.
- Evidence: reported; practice; [Interview](#src-one)

### rule-accept
- Kind: rule
- Name: Acceptance rule
- Meaning: Policy requires acceptance before work.
- Evidence: reported; policy; [Interview](#src-one)

### scenario-test
- Kind: scenario
- Name: A partial case
- Meaning: The clerk [checks the item](#action-check).
- Evidence: reported; practice; [Interview](#src-one)
- Status: Partial account; the outcome is unknown.

### q-order
- Kind: question
- Name: What happens next?
- Meaning: Subsequent handling is unknown.
- Evidence: unknown; practice; No source yet.

### src-one
- Kind: source
- Name: Interview
- Locator: Supplied answer A1.
'''

class RendererTests(unittest.TestCase):
    def setUp(self):
        self.model=parse_model(MODEL)
        self.view=default_view(self.model)

    def test_preserves_source_metadata_and_all_fields(self):
        result=build_data(MODEL)
        self.assertEqual(result['source'],MODEL)
        self.assertEqual(result['meta']['revision'],'1')
        self.assertEqual(result['records'],self.model['records'])
        self.assertEqual(len(result['sha256']),64)

    def test_crlf_source_is_preserved_and_hash_is_exact(self):
        source=MODEL.replace('\n','\r\n')
        result=build_data(source)
        self.assertEqual(result['source'],source)
        self.assertEqual(result['sha256'],hashlib.sha256(source.encode()).hexdigest())
        self.assertNotEqual(result['sha256'],self.model['sha256'])
        with self.assertRaisesRegex(ValueError,'sha256'):build_data(source,self.view)

    def test_default_does_not_infer_trace_or_edges(self):
        result=build_data(MODEL)
        self.assertEqual(result['scenarios'][0]['mode'],'guided-reading')
        self.assertEqual(result['edges'],[])

    def test_rejects_different_contract(self):
        with self.assertRaises(ValueError):parse_model(MODEL.replace('process-model/v1','process-model/v2'))

    def test_malformed_unreferenced_record_cannot_disappear(self):
        source=MODEL+'\n### action-Check\n- Kind: action\n- Name: Check\n- Meaning: A check.\n- Evidence: reported; practice; [Interview](#src-one)\n'
        with self.assertRaisesRegex(ValueError,'headings'):parse_model(source)

    def test_scenario_without_status_cannot_become_case_trace(self):
        source=MODEL.replace('- Status: Partial account; the outcome is unknown.\n','')
        with self.assertRaisesRegex(ValueError,'missing Status'):parse_model(source)

    def test_rejects_changed_baseline_even_without_revision_bump(self):
        with self.assertRaisesRegex(ValueError,'sha256'):
            build_data(MODEL.replace('A clerk checks','A manager checks'),self.view)

    def test_rejects_stale_revision(self):
        self.view['revision']=2
        with self.assertRaisesRegex(ValueError,'revision'):validate_view(self.view,self.model)

    def test_rejects_proposal_fields(self):
        self.view['improvements']=['automate']
        with self.assertRaisesRegex(ValueError,'proposal'):validate_view(self.view,self.model)

    def test_rejects_unresolved_frame_basis(self):
        self.view['scenarios'][0]['frames'][0]['basis'][0]['field']='Missing'
        with self.assertRaisesRegex(ValueError,'Unresolved basis'):validate_view(self.view,self.model)

    def test_rejects_invented_focus_ids(self):
        self.view['scenarios'][0]['frames'][0]['focus']=['action-invented']
        with self.assertRaisesRegex(ValueError,'Unknown focus'):validate_view(self.view,self.model)

    def test_case_trace_needs_scenario_link_and_no_concurrent_group(self):
        case=self.view['scenarios'][0];case['mode']='case-trace'
        validate_view(self.view,self.model)
        case['frames'][0]['focus'].append('rule-accept')
        with self.assertRaisesRegex(ValueError,'no inferred concurrency'):validate_view(self.view,self.model)

    def test_case_trace_rejects_unlinked_action(self):
        expanded=MODEL.replace('### rule-accept','### action-other\n- Kind: action\n- Name: Other\n- Meaning: Other action.\n- Evidence: reported; practice; [Interview](#src-one)\n\n### rule-accept')
        model=parse_model(expanded);view=default_view(model);view['scenarios'][0]['mode']='case-trace';view['scenarios'][0]['frames'][0]['focus']=['action-other']
        with self.assertRaisesRegex(ValueError,'must occur'):validate_view(view,model)

    def test_omitted_scenario_gets_safe_default(self):
        self.view['scenarios']=[]
        result=build_data(MODEL,self.view)
        self.assertEqual(result['scenarios'][0]['id'],'scenario-test')
        self.assertEqual(result['scenarios'][0]['mode'],'guided-reading')

    def test_no_scenarios_and_envisioned_are_valid(self):
        source=re.sub(r'### scenario-test\n.*?(?=### q-order)', '', MODEL, flags=re.S)
        source=source.replace('mode: EXISTING','mode: ENVISIONED').replace('; practice;','; intent;')
        result=build_data(source)
        self.assertEqual(result['scenarios'],[])
        self.assertEqual(result['meta']['mode'],'ENVISIONED')

    def test_escapes_hostile_markup_in_title_records_and_json(self):
        hostile='</script><img src=x onerror="alert(1)"><script>alert(2)</script>'
        source=MODEL.replace('A small captured process',hostile).replace('Check the item',hostile)
        output=render(source)
        self.assertNotIn(hostile,output)
        embedded=re.search(r'<script id="model-data" type="application/json">(.*?)</script>',output,re.S).group(1)
        restored=json.loads(embedded)
        self.assertEqual(restored['source'],source)
        self.assertEqual(restored['title'],hostile)

    def test_wrapped_fields_and_fenced_examples_match_validator(self):
        source=MODEL.replace('- Evidence: reported; practice; [Interview](#src-one)', '- Evidence: reported; practice;\n  [Interview](#src-one)')
        source+='\n```markdown\n### action-check\n```\n'
        result=build_data(source)
        self.assertEqual(len(result['records']),5)
        self.assertEqual(result['records'][0]['fields']['Evidence'],'reported; practice; [Interview](#src-one)')

    def test_workshop_artifact_is_reproducible_and_trace_is_case_only(self):
        root=Path(__file__).resolve().parents[1]
        artifact=(root/'fixtures/workshop.html').read_text()
        data=json.loads(re.search(r'<script id="model-data" type="application/json">(.*?)</script>',artifact,re.S).group(1))
        plan=json.loads((root/'fixtures/workshop.view.json').read_text())
        self.assertEqual(render(data['source'],plan),artifact)
        self.assertEqual(data['scenarios'][0]['mode'],'case-trace')
        self.assertTrue(all(s['mode']=='guided-reading' for s in data['scenarios'][1:]))
        self.assertNotIn(('action-inspect','action-check-parts'),[(e['from'],e['to']) for e in data['edges']])
        self.assertEqual(len(data['records']),39)
        canonical=root.parent/'capture-process/fixtures/workshop-process.md'
        if canonical.exists():self.assertEqual(canonical.read_text(),data['source'])

    def test_standalone_contract_and_validator_stay_identical(self):
        root=Path(__file__).resolve().parents[1]
        capture=root.parent/'capture-process'
        if not capture.exists():self.skipTest('No sibling package installed; renderer remains standalone.')
        for path in ['references/process-model-v1.md','scripts/validate_model.py']:
            self.assertEqual((root/path).read_bytes(),(capture/path).read_bytes())

if __name__=='__main__':unittest.main()
