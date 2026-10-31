"""Check the article-editing package and its bundled copies.

Run from any directory: python3 reviews/in-progress/article-editing/check.py

The skill is installed on its own, so every link must stay inside its folder.
It bundles the writing principles and prose pattern catalog that the technical
writing skills also bundle; those copies must stay identical. The reference
edit of the sample article must preserve the sample's code, as the bundled
fidelity script checks.
"""

import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SKILL = ROOT / "skills/in-progress/article-editing"
WRITING = ROOT / "skills/in-progress/technical-writing"
REVISION = ROOT / "skills/in-progress/technical-revision"
SHARED = ("writing-principles.md", "patterns.md", "third-party-notices.txt")
SCRIPTS = SKILL / "scripts"
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPTS))

import check_fidelity  # noqa: E402


class PackageIntegrity(unittest.TestCase):
    def test_skill_identity_and_concise_entrypoint(self):
        text = (SKILL / "SKILL.md").read_text()
        frontmatter, body = text.split("---", 2)[1:]
        self.assertIn("\nname: article-editing\n", frontmatter)
        self.assertRegex(frontmatter, r'\n  version: "\d+\.\d+\.\d+"\n')
        self.assertRegex(frontmatter, r'\n  lifecycle: "(in-progress|alpha|beta|release)"\n')
        # A context budget for the entry point; the references carry the depth.
        self.assertLessEqual(len(body.split()), 900)

    def test_links_stay_inside_the_skill(self):
        for document in sorted(SKILL.rglob("*.md")):
            for target in re.findall(r"\]\(([^)]+)\)", document.read_text()):
                with self.subTest(document=document.relative_to(SKILL), target=target):
                    relative, _, anchor = target.partition("#")
                    path = (document.parent / relative).resolve()
                    self.assertNotIn(":", relative, "links must be relative")
                    self.assertTrue(path.is_relative_to(SKILL) and path.is_file(), target)
                    if anchor:
                        headings = re.findall(r"^#+ (.+)$", path.read_text(), re.M)
                        slugs = [re.sub(r"[^\w -]", "", h.lower()).replace(" ", "-")
                                 for h in headings]
                        self.assertIn(anchor, slugs, target)

    def test_every_reference_and_fixture_is_discoverable(self):
        body = (SKILL / "SKILL.md").read_text()
        for reference in sorted((SKILL / "references").iterdir()):
            with self.subTest(reference=reference.name):
                self.assertIn(f"references/{reference.name}", body)
        for fixture in sorted((SKILL / "fixtures").iterdir()):
            with self.subTest(fixture=fixture.name):
                self.assertIn(f"fixtures/{fixture.name}", body)
        self.assertIn("scripts/check_fidelity.py", body)

    def test_bundled_copies_match_the_writing_skills(self):
        for name in SHARED:
            with self.subTest(file=name):
                source = (WRITING / "references" / name).read_bytes()
                self.assertEqual(source, (REVISION / "references" / name).read_bytes(),
                                 "technical-revision copy drifted from technical-writing")
                self.assertEqual(source, (SKILL / "references" / name).read_bytes(),
                                 "article-editing copy drifted from technical-writing")

    def test_article_pattern_ids_are_unique_and_sequential(self):
        text = (SKILL / "references/article-patterns.md").read_text()
        ids = re.findall(r"^\*\*A(\d\d): ", text, re.M)
        self.assertEqual(ids, [f"{n:02d}" for n in range(1, len(ids) + 1)])


class FixtureFidelity(unittest.TestCase):
    def test_reference_edit_preserves_the_sample_code(self):
        source = (SKILL / "fixtures/cqrs-article.md").read_text()
        edited = (SKILL / "fixtures/cqrs-article.EDITED.md").read_text()
        ok, lines = check_fidelity.report(source, edited)
        self.assertTrue(ok, "\n".join(lines))
        self.assertFalse([line for line in lines if line.startswith("WARN")], "\n".join(lines))
        self.assertTrue(any(line.startswith("OK code: ") for line in lines))

    def test_reference_edit_keeps_the_template_headings(self):
        source = (SKILL / "fixtures/cqrs-article.md").read_text()
        edited = (SKILL / "fixtures/cqrs-article.EDITED.md").read_text()
        heading = re.compile(r"^## (.+)$", re.M)
        source_headings = heading.findall(source)
        edited_headings = heading.findall(edited.split("\n---\n")[0])
        self.assertEqual(edited_headings, source_headings)

    def test_reference_edit_ends_with_an_editors_note(self):
        edited = (SKILL / "fixtures/cqrs-article.EDITED.md").read_text()
        note = edited.split("\n---\n")[-1]
        for section in ("Structure changes", "Cuts", "Author questions", "Assumptions"):
            self.assertIn(section, note)

    def test_fidelity_script_unit_tests_pass(self):
        result = subprocess.run(
            [sys.executable, "-m", "unittest", "test_check_fidelity"],
            cwd=SCRIPTS, capture_output=True, text=True, env={"PYTHONDONTWRITEBYTECODE": "1"},
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fidelity_script_fails_on_altered_code(self):
        source = SKILL / "fixtures/cqrs-article.md"
        edited = (SKILL / "fixtures/cqrs-article.EDITED.md").read_text()
        broken = edited.replace("Version++;", "Version += 1;", 1)
        self.assertNotEqual(broken, edited)
        tmp = SCRIPTS / ".broken-edit.md"
        tmp.write_text(broken)
        try:
            result = subprocess.run(
                [sys.executable, str(SCRIPTS / "check_fidelity.py"), str(source), str(tmp)],
                capture_output=True, text=True,
            )
        finally:
            tmp.unlink()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("FAIL code:", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
