#!/usr/bin/env python3
"""Check proposal structure and baseline pins, not the merit or truth of advice."""

from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

from validate_model import SLUG, validate as validate_model

REQUIRED = {
    "Name", "Status", "Problem", "Basis", "Affects", "Diagnosis", "Change",
    "Alternatives", "Tradeoffs", "Constraints", "Benefit hypothesis", "Test", "Decision",
}
STATUSES = {"proposed", "needs-evidence", "accepted", "rejected", "deferred", "superseded"}
LINK = re.compile(r"\[[^\]]+\]\(([^()\n]+)\)")
HEADING = re.compile(r"^### (" + SLUG + r")\s*$", re.MULTILINE)
FIELD = re.compile(r"^- ([A-Za-z][A-Za-z /-]*):\s*(.*)$")


def parse(text: str) -> tuple[dict, dict, str, list[str]]:
    """Read the contract's intentionally small Markdown envelope and records."""
    text = text.replace("\r\n", "\n")  # Parse only; hashes use original bytes.
    errors = []
    if not text.startswith("---\n") or (end := text.find("\n---\n", 4)) < 0:
        return {}, {}, "", ["Missing or unclosed frontmatter."]
    meta = {}
    for line in text[4:end].splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep:
            errors.append(f"Invalid metadata line: {line!r}")
            continue
        key, value = key.strip(), value.strip().strip("\"'")
        if key in meta:
            errors.append(f"Duplicate metadata field: {key}")
        meta[key] = value
    body = re.sub(r"^```[^\n]*\n.*?^```\s*$", "", text[end + 5:],
                  flags=re.MULTILINE | re.DOTALL)
    headings = list(HEADING.finditer(body))
    records = {}
    # Misspelled ID headings must not quietly turn a proposal into prose.
    for title in re.findall(r"^### (.+)$", body, re.MULTILINE):
        if not re.fullmatch(SLUG, title.strip()):
            errors.append(f"Level-three headings must be lowercase record IDs: {title}")
    for index, heading in enumerate(headings):
        rid = heading.group(1)
        stop = headings[index + 1].start() if index + 1 < len(headings) else len(body)
        section = re.split(r"^#{1,2} ", body[heading.end():stop], maxsplit=1,
                           flags=re.MULTILINE)[0]
        if rid in records:
            errors.append(f"Duplicate record ID: {rid}")
        fields, current = {}, None
        for line in section.splitlines():
            match = FIELD.match(line)
            if match:
                name, value = match.groups()
                if name in fields:
                    errors.append(f"{rid}: duplicate field {name}")
                fields[name], current = value.strip(), name
            elif current and line.startswith((" ", "\t")):
                fields[current] += " " + line.strip()
            elif line.strip():
                current = None
        records[rid] = fields
    return meta, records, body, errors


def validate(proposals: str, baseline: bytes) -> list[str]:
    """Validate against explicitly supplied bytes; never resolve artifact locators."""
    try:
        source = baseline.decode("utf-8")
    except UnicodeError:
        return ["Baseline must be UTF-8."]
    errors = [f"Baseline: {error}" for error in validate_model(source.replace("\r\n", "\n"))]
    original, baseline_records, _, parse_errors = parse(source)
    errors.extend(f"Baseline: {error}" for error in parse_errors)
    meta, records, body, parse_errors = parse(proposals)
    errors.extend(parse_errors)
    if meta.get("format") != "process-improvement/v1":
        errors.append("format must be process-improvement/v1.")
    if not re.fullmatch(SLUG, meta.get("assessment_id", "")):
        errors.append("assessment_id must be a lowercase slug.")
    if not re.fullmatch(r"[1-9][0-9]*", meta.get("revision", "")):
        errors.append("revision must be a positive integer.")
    for key in ("format", "model_id", "revision", "mode", "agreement", "coverage"):
        if meta.get(f"baseline_{key}") != original.get(key) or key not in original:
            errors.append(f"baseline_{key} does not match the supplied baseline.")
    digest = hashlib.sha256(baseline).hexdigest()
    if meta.get("baseline_sha256") != digest:
        errors.append("baseline_sha256 does not match exact baseline bytes.")
    locator = meta.get("baseline_locator", "")
    if not locator or "#" in locator:
        errors.append("baseline_locator must be nonempty and have no fragment.")

    def baseline_ids(value: str) -> set[str]:
        return {link[len(locator) + 1:] for link in LINK.findall(value)
                if locator and link.startswith(locator + "#")}

    for link in LINK.findall(body):
        if link.startswith("#") and link[1:] not in records:
            errors.append(f"Unknown proposal link: {link}")
        elif locator and link.startswith(locator + "#"):
            if link[len(locator) + 1:] not in baseline_records:
                errors.append(f"Unknown baseline record: {link}")
    for rid, fields in records.items():
        for field in sorted(REQUIRED):
            if not fields.get(field):
                errors.append(f"{rid}: missing {field}.")
        if fields.get("Status") not in STATUSES:
            errors.append(f"{rid}: invalid Status.")
        if fields.get("Status") == "accepted" and not fields.get("Decision evidence"):
            errors.append(f"{rid}: accepted requires Decision evidence.")
        basis = baseline_ids(fields.get("Basis", ""))
        if not (basis & baseline_records.keys()):
            errors.append(f"{rid}: Basis needs a baseline record link.")
        affected = baseline_ids(fields.get("Affects", ""))
        if not affected or any(baseline_records.get(target, {}).get("Kind") in (None, "source")
                               for target in affected):
            errors.append(f"{rid}: Affects needs non-source baseline record links.")
    if not body.strip():
        errors.append("Missing assessment body.")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("proposals", type=Path)
    parser.add_argument("--baseline", type=Path, required=True)
    args = parser.parse_args()
    try:
        errors = validate(args.proposals.read_text(encoding="utf-8"), args.baseline.read_bytes())
    except (OSError, UnicodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    if errors:
        print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
        return 1
    print(f"PASS: {args.proposals} (pins and structure only; evidence review still required)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
