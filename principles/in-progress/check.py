"""Check the coding-principles skill against its context budget and format rules.

Run from the repo root: uv run principles/in-progress/check.py
"""
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2] / "skills" / "in-progress" / "coding-principles"
LIMITS = {"description": 55, "body": 350, "file": 450, "entry": 90}


def words(text):
    return len(text.split())


def tokens(text):
    return round(words(text) * 1.35)


def main():
    errors = []
    skill_md = (SKILL / "SKILL.md").read_text()
    # Optional release metadata is not part of the instruction budget.
    match = re.match(
        r"---\nname: ([^\n]+)\ndescription: '([^\n]+)'\n"
        r"(?:metadata:\n(?:  [^\n]+\n)+)?---\n(.*)", skill_md, re.S
    )
    if not match:
        sys.exit("SKILL.md needs name and description frontmatter")
    _, description, body = match.groups()

    if words(description) > LIMITS["description"]:
        errors.append(f"description is {words(description)} words (max {LIMITS['description']})")
    if words(body) > LIMITS["body"]:
        errors.append(f"SKILL.md body is {words(body)} words (max {LIMITS['body']})")

    refs = {p.name: p for p in sorted((SKILL / "references").glob("*.md"))}
    linked = set(re.findall(r"`([\w-]+\.md)`", body))
    for name in refs.keys() - linked:
        errors.append(f"{name} is not listed in SKILL.md")
    for name in linked - refs.keys():
        errors.append(f"SKILL.md lists missing file {name}")

    print(f"always loaded: description {tokens(description)} tokens")
    print(f"on trigger:    SKILL.md body {tokens(body)} tokens")
    for name, path in refs.items():
        text = path.read_text()
        print(f"on demand:     {name:<20} {tokens(text)} tokens")
        if words(text) > LIMITS["file"]:
            errors.append(f"{name} is {words(text)} words (max {LIMITS['file']})")
        for entry in re.split(r"\n(?=## )", text)[1:]:
            title = entry.splitlines()[0]
            if "\nUse when:" not in entry:
                errors.append(f"{name}: '{title}' has no 'Use when:' line")
            if words(entry) > LIMITS["entry"]:
                errors.append(f"{name}: '{title}' is {words(entry)} words (max {LIMITS['entry']})")

    for path in [SKILL / "SKILL.md", *refs.values()]:
        if re.search("[–—]", path.read_text()):
            errors.append(f"{path.name} has an em or en dash")

    for error in errors:
        print("FAIL", error)
    sys.exit(1 if errors else 0)


main()
