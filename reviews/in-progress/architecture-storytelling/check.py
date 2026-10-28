"""Check the independently installable architecture-storytelling package."""
from pathlib import Path
import re
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[3]
SKILL = ROOT / 'skills/in-progress/architecture-storytelling'


class PackageChecks(unittest.TestCase):
    def test_metadata(self):
        text = (SKILL / 'SKILL.md').read_text()
        metadata = yaml.safe_load(text.split('---', 2)[1])
        self.assertEqual(metadata['name'], SKILL.name)
        self.assertEqual(metadata['metadata'], {'version': '0.0.1', 'lifecycle': 'in-progress'})
        self.assertNotIn('in progress', metadata['description'].lower())

    def test_references_stay_in_installation(self):
        for file in SKILL.rglob('*.md'):
            for target in re.findall(r'\]\(([^)]+)\)', file.read_text()):
                with self.subTest(file=file, target=target):
                    self.assertNotRegex(target, r'^(?:https?:|/)')
                    path = (file.parent / target.split('#')[0]).resolve()
                    self.assertTrue(path.is_relative_to(SKILL.resolve()))
                    self.assertTrue(path.is_file())

    def test_ui_metadata(self):
        data = yaml.safe_load((SKILL / 'agents/openai.yaml').read_text())
        self.assertIn('$architecture-storytelling', data['interface']['default_prompt'])
        self.assertLessEqual(len(data['interface']['short_description']), 64)


if __name__ == '__main__':
    unittest.main()
