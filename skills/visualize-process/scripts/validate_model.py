#!/usr/bin/env python3
"""Check Process Model v1 structure. This deliberately does not claim truth checking."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

KINDS = {
    "context", "actor", "concept", "action", "event", "state",
    "relationship", "rule", "scenario", "question", "source",
}
STATUSES = {"observed", "reported", "inferred", "disputed", "unknown"}
CLAIMS = {"practice", "policy", "intent", "definition"}
SLUG = r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
LINK = re.compile(r"\[[^\]]+\]\(#(" + SLUG + r")\)")
LOCAL_LINK = re.compile(r"\[[^\]]+\]\(#([^)]*)\)")
HEADING = re.compile(r"^### (" + SLUG + r")\s*$", re.MULTILINE)
FIELD = re.compile(r"^- ([A-Za-z][A-Za-z /-]*):\s*(.*)$")


def validate(text: str) -> list[str]:
    errors: list[str] = []
    if not text.startswith("---\n"):
        return ["Missing YAML-style frontmatter at the start."]
    end = text.find("\n---\n", 4)
    if end < 0:
        return ["Frontmatter is not closed."]
    metadata: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep:
            errors.append(f"Invalid metadata line: {line!r}")
            continue
        key, value = key.strip(), value.strip().strip("\"'")
        if key in metadata:
            errors.append(f"Duplicate metadata field: {key}")
        metadata[key] = value
    expected = {
        "format": {"process-model/v1"},
        "mode": {"EXISTING", "ENVISIONED"},
        "agreement": {"draft", "user-confirmed"},
        "coverage": {"partial", "reviewable"},
    }
    for key, allowed in expected.items():
        if metadata.get(key) not in allowed:
            errors.append(f"{key} must be one of {sorted(allowed)}.")
    if not re.fullmatch(SLUG, metadata.get("model_id", "")):
        errors.append("model_id must be a lowercase slug.")
    if not re.fullmatch(r"[1-9][0-9]*", metadata.get("revision", "")):
        errors.append("revision must be a positive integer.")

    body = text[end + 5:]
    # Fenced examples and Mermaid code do not define records or Markdown links.
    visible = re.sub(r"^```[^\n]*\n.*?^```\s*$", "", body,
                     flags=re.MULTILINE | re.DOTALL)
    # A malformed ID must not silently disappear from a downstream consumer.
    for title in re.findall(r"^### (.+)$", visible, re.MULTILINE):
        if not re.fullmatch(SLUG, title.strip()):
            errors.append(f"Level-three headings must be lowercase record IDs: {title}")
    headings = list(HEADING.finditer(visible))
    records: dict[str, dict[str, str]] = {}
    for index, heading in enumerate(headings):
        record_id = heading.group(1)
        next_heading = headings[index + 1].start() if index + 1 < len(headings) else len(visible)
        section = visible[heading.end():next_heading]
        # A level-one/two heading ends this record's fields.
        section = re.split(r"^#{1,2} ", section, maxsplit=1, flags=re.MULTILINE)[0]
        if record_id in records:
            errors.append(f"Duplicate record ID: {record_id}")
        fields: dict[str, str] = {}
        current_field = None
        for line in section.splitlines():
            match = FIELD.match(line)
            if match:
                name, value = match.groups()
                if name in fields:
                    errors.append(f"{record_id}: duplicate field {name}")
                fields[name] = value.strip()
                current_field = name
            elif current_field and line.startswith((" ", "\t")):
                fields[current_field] += " " + line.strip()
            elif line.strip():
                current_field = None
        records[record_id] = fields
    if not records:
        errors.append("No ID-only level-three record headings found.")
    sources = {rid for rid, fields in records.items() if fields.get("Kind") == "source"}
    for record_id, fields in records.items():
        kind = fields.get("Kind")
        if kind not in KINDS:
            errors.append(f"{record_id}: invalid or missing Kind.")
        required = {"Name", "Locator"} if kind == "source" else {"Name", "Meaning", "Evidence"}
        for name in sorted(required):
            if not fields.get(name):
                errors.append(f"{record_id}: missing {name}.")
        if kind == "scenario" and not fields.get("Status"):
            errors.append(f"{record_id}: missing Status.")
        if kind == "source":
            continue
        evidence = fields.get("Evidence", "")
        parts = [part.strip() for part in evidence.split(";")]
        if len(parts) < 2 or parts[0] not in STATUSES or parts[1] not in CLAIMS:
            errors.append(f"{record_id}: Evidence must begin 'status; claim type; ...'.")
        status = parts[0] if parts else ""
        if status != "unknown" and not (set(LINK.findall(evidence)) & sources):
            errors.append(f"{record_id}: Evidence needs a link to a source record.")
        if kind == "relationship":
            for name in ("From", "To"):
                targets = LINK.findall(fields.get(name, ""))
                if len(targets) != 1:
                    errors.append(f"{record_id}: {name} needs exactly one record link.")
                elif targets[0] in sources:
                    errors.append(f"{record_id}: {name} must be a model record, not a source.")
            if not fields.get("Relation"):
                errors.append(f"{record_id}: missing Relation.")
    for target in sorted(set(LINK.findall(visible)) - records.keys()):
        errors.append(f"Unresolved record link: #{target}")
    for target in LOCAL_LINK.findall(visible):
        if not re.fullmatch(SLUG, target):
            errors.append(f"Invalid record link: #{target}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    args = parser.parse_args()
    try:
        errors = validate(args.model.read_text(encoding="utf-8"))
    except (OSError, UnicodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    if errors:
        print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
        return 1
    print(f"PASS: {args.model} (structure only; evidence review still required)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
