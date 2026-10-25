"""Check independently installable writing skills, not the quality of their prose.

Requires PyYAML. Run from any directory with Python 3.10 or later.
Behavioral evaluation prompts and observations live beside this file.
"""

import re
import tempfile
import unittest
from pathlib import Path
from shutil import copytree

import yaml


ROOT = Path(__file__).resolve().parents[3]
SKILLS = [ROOT / "skills/in-progress" / name
          for name in ("technical-writing", "technical-revision")]
SHARED = ("writing-principles.md", "revision-pass.md", "patterns.md",
          "unslop-license.txt")


def local_links(document, root):
    text = document.read_text()
    # Source credits are plain text; no installed package may require the web.
    if re.search(r"https?://|file://", text):
        raise ValueError(f"External URL in {document.relative_to(root)}")
    targets = []
    for link in re.findall(r"\]\(([^)]+)\)", text):
        relative, _, anchor = link.partition("#")
        if Path(relative).is_absolute() or ":" in relative:
            raise ValueError(f"Nonrelative link: {link}")
        target = (document.parent / relative).resolve()
        if not target.is_relative_to(root) or not target.is_file():
            raise ValueError(f"Missing or escaping link: {link}")
        if anchor:
            headings = re.findall(r"^#+ (.+)$", target.read_text(), re.M)
            slugs = {re.sub(r"[^\w -]", "", h.lower()).replace(" ", "-")
                     for h in headings}
            if anchor not in slugs:
                raise ValueError(f"Missing anchor: {link}")
        targets.append(target)
    return targets


class Packages(unittest.TestCase):
    def test_metadata_and_explicit_invocation(self):
        for skill in SKILLS:
            with self.subTest(skill=skill.name):
                text = (skill / "SKILL.md").read_text()
                metadata = yaml.safe_load(text.split("---", 2)[1])
                self.assertEqual(metadata["name"], skill.name)
                self.assertTrue(metadata["description"])
                self.assertRegex(metadata["metadata"]["version"], r"^0\.0\.[1-9]\d*$")
                self.assertEqual(metadata["metadata"]["lifecycle"], "in-progress")
                config = yaml.safe_load((skill / "agents/openai.yaml").read_text())
                self.assertIs(config["policy"]["allow_implicit_invocation"], False)
                self.assertIn(f"${skill.name}", config["interface"]["default_prompt"])

    def test_shared_material_is_identical(self):
        for name in SHARED:
            with self.subTest(reference=name):
                self.assertEqual((SKILLS[0] / "references" / name).read_bytes(),
                                 (SKILLS[1] / "references" / name).read_bytes())

    def test_each_package_works_in_isolation(self):
        for skill in SKILLS:
            with self.subTest(skill=skill.name), tempfile.TemporaryDirectory() as temp:
                standalone = copytree(skill, Path(temp) / skill.name).resolve()
                pending = [standalone / "SKILL.md"]
                reached = set()
                while pending:
                    document = pending.pop()
                    if document in reached:
                        continue
                    reached.add(document)
                    if document.suffix == ".md":
                        pending.extend(local_links(document, standalone))
                for reference in (standalone / "references").iterdir():
                    self.assertIn(reference, reached, "Unreachable bundled reference")
                for document in standalone.rglob("*.md"):
                    local_links(document, standalone)

    def test_pattern_ids_are_unique(self):
        for skill in SKILLS:
            text = (skill / "references/patterns.md").read_text()
            ids = re.findall(r"\b[CP]\d{2}\b", text)
            self.assertTrue(ids, "Catalog needs stable pattern IDs")
            self.assertEqual(len(ids), len(set(ids)), "A pattern ID was reused")

    def test_context_budget(self):
        # Maintenance limits for these packages, never limits on the user's writing.
        for skill in SKILLS:
            with self.subTest(skill=skill.name):
                body = (skill / "SKILL.md").read_text().split("---", 2)[2]
                self.assertLessEqual(len(body.split()), 650)
                total = len(body.split()) + sum(
                    len(p.read_text().split()) for p in (skill / "references").glob("*.md"))
                self.assertLessEqual(total, 2400)


if __name__ == "__main__":
    unittest.main(verbosity=2)
