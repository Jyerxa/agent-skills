#!/usr/bin/env python3
"""Compare an edited article with its source and report what did not survive.

Usage: python3 check_fidelity.py SOURCE EDITED [--allow-code-changes]

The edit may reorder, regroup, and reword prose. It may split a code listing
into segments with prose between them. It may not change the code itself, and
it should not lose identifiers, numbers, or links without saying so. This
script checks those mechanically; it says nothing about clarity.

Exit status is 1 when code was changed, added, or dropped, unless
--allow-code-changes is given. Everything else is a warning for the editor
to resolve or explain in the note.
"""

import difflib
import re
import sys
from pathlib import Path

FENCE = re.compile(r"^(```|~~~)")
PRE_BLOCK = re.compile(r"<pre\b[^>]*>(.*?)</pre>", re.S | re.I)
INLINE_CODE = re.compile(r"`([^`\n]+)`")
LINK = re.compile(r"\]\(([^)\s]+)\)|(?<![(\w])(https?://[^\s)>\]]+)")
NUMBER = re.compile(r"(?<![\w.])\d[\d,]*(?:\.\d+)?(?:\s?(?:%|ms|s|x|×))?(?![\w.])")
HEADING = re.compile(r"^#{1,6}\s+(.+?)\s*#*$", re.M)
TAG = re.compile(r"<[^>]+>")


def split_code_and_prose(text):
    """Return (code_blocks, prose) for Markdown fences and HTML <pre> blocks."""
    blocks = []
    prose_lines = []
    fence = None
    current = []
    for line in text.splitlines():
        match = FENCE.match(line)
        if fence is None and match:
            fence = match.group(1)
            current = []
            continue
        if fence is not None and line.startswith(fence):
            blocks.append("\n".join(current))
            fence = None
            continue
        (current if fence is not None else prose_lines).append(line)
    if fence is not None:  # unterminated fence: keep what we have
        blocks.append("\n".join(current))
    prose = "\n".join(prose_lines)
    for match in PRE_BLOCK.finditer(prose):
        blocks.append(TAG.sub("", match.group(1)))
    prose = PRE_BLOCK.sub(" ", prose)
    return blocks, prose


def code_lines(blocks):
    return [line.rstrip() for block in blocks for line in block.splitlines() if line.strip()]


def compare_code(source_blocks, edited_blocks):
    """Return (status, messages). status is 'same', 'reordered', or 'changed'."""
    source = code_lines(source_blocks)
    edited = code_lines(edited_blocks)
    if source == edited:
        return "same", [f"code: {len(source)} lines preserved in order"]
    if sorted(source) == sorted(edited):
        return "reordered", ["code: same lines, different order; confirm any complete "
                             "listing still compiles in the published order"]
    messages = []
    matcher = difflib.SequenceMatcher(a=source, b=edited, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag in ("delete", "replace"):
            for line in source[i1:i2]:
                messages.append(f"code: source line missing or altered: {line.strip()}")
        if tag in ("insert", "replace"):
            for line in edited[j1:j2]:
                messages.append(f"code: line not in source: {line.strip()}")
    return "changed", messages


def missing(items, haystack):
    return sorted({item for item in items if item not in haystack})


def report(source_text, edited_text, allow_code_changes=False):
    """Return (ok, lines). ok is False only for unexplained code changes."""
    source_blocks, source_prose = split_code_and_prose(source_text)
    edited_blocks, edited_prose = split_code_and_prose(edited_text)
    lines = []

    status, messages = compare_code(source_blocks, edited_blocks)
    ok = status != "changed" or allow_code_changes
    prefix = "OK" if status == "same" else ("WARN" if ok else "FAIL")
    lines.extend(f"{prefix} {message}" for message in messages)
    if status == "changed" and len(messages) > 40:
        lines = lines[:40] + [f"{prefix} code: {len(messages) - 40} more differences"]

    edited_all = edited_text
    for label, pattern, text in (
        ("inline code", INLINE_CODE, source_prose),
        ("number", NUMBER, source_prose),
    ):
        found = missing((m.group(0).strip("`") for m in pattern.finditer(text)), edited_all)
        for item in found:
            lines.append(f"WARN {label} missing from edit: {item}")
        if not found:
            lines.append(f"OK every {label} in the source prose appears in the edit")

    source_links = {a or b for a, b in LINK.findall(source_prose)}
    lost_links = missing(source_links, edited_all)
    for link in lost_links:
        lines.append(f"WARN link missing from edit: {link}")
    if not lost_links:
        lines.append("OK every link in the source appears in the edit")

    source_headings = HEADING.findall(source_prose)
    edited_headings = set(HEADING.findall(edited_prose))
    for heading in source_headings:
        if heading not in edited_headings:
            lines.append(f"INFO heading not kept verbatim: {heading}")

    return ok, lines


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    flags = {a for a in argv if a.startswith("--")}
    if len(args) != 2 or flags - {"--allow-code-changes"}:
        print(__doc__.strip())
        return 2
    source = Path(args[0]).read_text(encoding="utf-8")
    edited = Path(args[1]).read_text(encoding="utf-8")
    ok, lines = report(source, edited, "--allow-code-changes" in flags)
    print("\n".join(lines))
    print("RESULT " + ("pass" if ok else "fail: code changed"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
