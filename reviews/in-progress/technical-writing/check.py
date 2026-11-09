"""Check the technical-writing and technical-revision packages and their evals.

Run from any directory: python3 reviews/in-progress/technical-writing/check.py
Each skill installs on its own, so links must stay inside its folder, and the
references both skills bundle must stay identical. The fixture checks confirm
the premises the eval assertions rely on, not the quality of a written document.
"""
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
WRITING = ROOT / "skills/in-progress/technical-writing"
REVISION = ROOT / "skills/in-progress/technical-revision"
SKILLS = (WRITING, REVISION)
SHARED = ("writing-principles.md", "patterns.md", "revision-pass.md", "third-party-notices.txt")
EVALS = Path(__file__).resolve().parent / "evals"
sys.dont_write_bytecode = True


def frontmatter(path):
    return yaml.safe_load(path.read_text().split("---", 2)[1])


class PackageIntegrity(unittest.TestCase):
    def test_metadata(self):
        for skill in SKILLS:
            with self.subTest(skill=skill.name):
                meta = frontmatter(skill / "SKILL.md")
                self.assertEqual(meta["name"], skill.name)
                self.assertIs(meta["disable-model-invocation"], True)
                self.assertEqual(meta["metadata"]["lifecycle"], "in-progress")
                self.assertRegex(meta["metadata"]["version"], r"^0\.0\.[1-9]\d*$")
                self.assertNotIn("in progress", meta["description"].lower())

    def test_ui_metadata(self):
        for skill in SKILLS:
            with self.subTest(skill=skill.name):
                data = yaml.safe_load((skill / "agents/openai.yaml").read_text())
                self.assertIn(f"${skill.name}", data["interface"]["default_prompt"])
                self.assertLessEqual(len(data["interface"]["short_description"]), 64)
                self.assertIs(data["policy"]["allow_implicit_invocation"], False)

    def test_shared_references_are_identical(self):
        for name in SHARED:
            with self.subTest(reference=name):
                self.assertEqual((WRITING / "references" / name).read_text(),
                                 (REVISION / "references" / name).read_text(),
                                 "edit both copies together and bump both versions")

    def test_links_stay_inside_each_skill(self):
        for skill in SKILLS:
            for document in sorted(skill.rglob("*.md")):
                for target in re.findall(r"\]\(([^)]+)\)", document.read_text()):
                    with self.subTest(document=document.relative_to(ROOT), target=target):
                        self.assertNotRegex(target, r"^(?:[a-z]+:|/)")
                        path = (document.parent / target.split("#")[0]).resolve()
                        self.assertTrue(path.is_relative_to(skill.resolve()) and path.is_file())

    def test_every_writing_reference_is_linked(self):
        body = (WRITING / "SKILL.md").read_text()
        for reference in (WRITING / "references").iterdir():
            with self.subTest(reference=reference.name):
                self.assertIn(f"references/{reference.name}", body)

    def test_writing_skill_does_not_invoke_revision_skill(self):
        # technical-revision disables model invocation, so the bundled pass is the only path.
        body = (WRITING / "SKILL.md").read_text()
        self.assertNotRegex(body, r"(?i)\brun technical-revision\b")


class EvalCases(unittest.TestCase):
    def cases(self):
        return sorted(p for p in EVALS.iterdir() if (p / "case.yaml").is_file())

    def test_case_layout(self):
        self.assertEqual(len(self.cases()), 3)
        for case in self.cases():
            with self.subTest(case=case.name):
                spec = yaml.safe_load((case / "case.yaml").read_text())
                self.assertEqual(spec["schema_version"], "1.1")
                self.assertEqual(spec["name"], case.name)
                settings = yaml.safe_load((case / "prompt.md").read_text().split("---", 2)[1])
                self.assertLessEqual(set(settings), {"tags", "max_turns", "timeout_seconds", "allowed_tools"})
                graders = sorted((case / "graders").glob("*.md"))
                self.assertTrue(graders)
                for grader in graders:
                    head = yaml.safe_load(grader.read_text().split("---", 2)[1])
                    self.assertEqual(head, {"type": "llm", "focus": "trace", "weight": 1})
                for name in re.findall(r"^Input files: (.+)$", (case / "prompt.md").read_text(), re.M)[0].split(", "):
                    self.assertTrue((case / "files" / name).is_file(), name)


class FixturePremises(unittest.TestCase):
    KEYCTL = EVALS / "runbook-from-cli-source/files/tools/keyctl/keyctl.py"

    def keyctl(self, *args, token="test"):
        env = {"PATH": os.environ["PATH"], "KEYCTL_STATE": self.state}
        if token:
            env["KEYCTL_TOKEN"] = token
        return subprocess.run([sys.executable, str(self.KEYCTL), *args],
                              capture_output=True, text=True, env=env)

    def setUp(self):
        self.state = str(Path(tempfile.mkdtemp()) / "state.json")

    def test_keyctl_contract_used_by_runbook_assertions(self):
        self.assertEqual(self.keyctl("status", "--env", "prod", token="").returncode, 3)
        self.assertEqual(self.keyctl("rotate", "--env", "prod").returncode, 2)
        # argparse accepts the README's --grace as an abbreviation of --grace-hours.
        abbreviated = self.keyctl("rotate", "--env", "staging", "--grace", "12", "--dry-run")
        self.assertEqual(abbreviated.returncode, 0)
        dry = self.keyctl("rotate", "--env", "prod", "--confirm", "prod", "--dry-run")
        self.assertIn("dry run", dry.stdout)
        self.assertEqual(self.keyctl("rotate", "--env", "prod", "--confirm", "prod").returncode, 0)
        self.assertEqual(self.keyctl("rotate", "--env", "prod", "--confirm", "prod").returncode, 4)
        self.assertEqual(self.keyctl("revert", "--env", "prod", "--to", "wk_prod0001").returncode, 0)
        self.assertEqual(self.keyctl("revert", "--env", "prod", "--to", "wk_prod0001").returncode, 5)
        help_text = self.keyctl("rotate", "--help").stdout
        self.assertIn("default 24", help_text)

    def test_readme_still_disagrees_with_code(self):
        readme = (self.KEYCTL.parent / "README.md").read_text()
        self.assertIn("--grace 12", readme)
        self.assertIn("48 hours", readme)

    def test_tinyq_retries_allow_n_plus_one_attempts(self):
        sys.path.insert(0, str(EVALS / "tutorial-with-runnable-examples/files"))
        try:
            import tinyq
        finally:
            sys.path.pop(0)
        calls = []

        @tinyq.task(retries=2)
        def always_fails():
            calls.append(1)
            raise RuntimeError("boom")

        queue = tinyq.Queue()
        job = queue.enqueue(always_fails)
        self.assertEqual(queue.run(), [job])
        self.assertEqual((job.status, job.attempts, len(calls)), ("failed", 3, 3))

    def test_incident_notes_contain_the_traps(self):
        notes = (EVALS / "postmortem-from-incident-notes/files/incident-notes.md").read_text()
        for phrase in ("Dan's deploy broke it", "~3%", "2.7%", "NOT confirmed", "nobody took it"):
            self.assertIn(phrase, notes)


if __name__ == "__main__":
    unittest.main(verbosity=2)
