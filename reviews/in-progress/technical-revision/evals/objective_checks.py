"""Run the objective parts of the technical-revision eval assertions.

Usage: python3 objective_checks.py <case-name> <original-files-dir> <run-outputs-dir>
Prints evidence for a grader; it does not decide subjective assertions.
"""
import re
import sys
from pathlib import Path

FENCE = re.compile(r"^([ \t]*)```[^\n`]*\n(.*?)^\1```", re.M | re.S)


def prose_words(text):
    return len(FENCE.sub("", text).split())


def blocks(text):
    return [m.group(2) for m in FENCE.finditer(text)]


def runbook(orig, run):
    name = "docs/runbooks/clear-stuck-export-jobs.md"
    before, after = (orig / name).read_text(), (run / name).read_text()
    print("prose words:", prose_words(before), "->", prose_words(after),
          f"({1 - prose_words(after) / prose_words(before):.0%} shorter)")
    print("blocks with $ prompt:", sum(bool(re.search(r"^\s*\$ ", b, re.M)) for b in blocks(after)))
    print("blocks mixing command and other lines:",
          sum(1 for b in blocks(after) if "exportctl" in b and len([l for l in b.splitlines() if l.strip()]) > 1))

    def commands(text):
        return [re.sub(r"\s+", " ", l.strip().lstrip("$ ").strip())
                for b in blocks(text) for l in b.splitlines() if "exportctl.py" in l]
    old, new = commands(before), commands(after)
    print("original commands missing from revision:", [c for c in old if c not in new])
    print("revision commands:", new)
    purge_cmd = after.find("--purge\n") if "--purge\n" in after else after.find("--purge")
    warn = re.search(r"(permanent|cannot be undone|no way to get)", after, re.I)
    first_purge_cmd = min((after.find(l) for b in blocks(after) for l in b.splitlines() if "cancel" in l and "--purge" in l), default=-1)
    print("first permanent-delete warning offset:", warn.start() if warn else None, "purge command offset:", first_purge_cmd)
    print("mentions 12 hours:", bool(re.search(r"12[ -]?h", after)), "mentions 6 hours:", bool(re.search(r"\b6[ -]?h", after)))


def postmortem(orig, run):
    name = "postmortem-inc-3104.md"
    print("file unchanged:", (orig / name).read_text() == (run / name).read_text())


def design(orig, run):
    name = "cache-design.md"
    before, after = (orig / name).read_text(), (run / name).read_text()
    heads = lambda t: re.findall(r"^#+ .*$", t, re.M)
    print("headings unchanged:", heads(before) == heads(after), heads(after))
    req = lambda t: t.split("## Requirements", 1)[1].split("\n## ", 1)[0]
    kw = lambda t: re.findall(r"\b(MUST NOT|MUST|SHALL)\b", req(t))
    print("RFC 2119 keywords:", kw(before), "->", kw(after), "| definition kept:", "RFC 2119" in after)
    print("shall/should present:", "shall/should" in after)
    print("hidden verbs left:", [p for p in ("make a change to", "performs the validation of", "makes a determination") if p in after])
    quote = "We changed a price at 9 a.m. and our shoppers still saw the old one at dinner."
    print("quote verbatim:", quote in after)
    facts = lambda t: set(re.findall(r"`[^`]+`|\b\d[\d,.]*\b", t))
    print("facts missing:", sorted(facts(before) - facts(after)))
    print("words:", len(before.split()), "->", len(after.split()), f"({1 - len(after.split()) / len(before.split()):.0%} shorter)")
    print("and/or present:", "and/or" in after)


if __name__ == "__main__":
    case, orig, run = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    {"revise-runbook-steps-and-code": runbook, "postmortem-recommend-and-approve": postmortem,
     "design-doc-prose-only": design}[case](orig, run)
