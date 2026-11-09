"""Run the objective parts of the technical-writing eval assertions.

Usage: python3 objective_checks.py <case-name> <project-root>
Prints evidence for a grader; it does not decide subjective assertions.
"""
import re
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

FENCE = re.compile(r"^([ \t]*)```([^\n`]*)\n(.*?)^\1```", re.M | re.S)


def blocks(text):
    return [(m.group(2).strip(), textwrap.dedent(m.group(3))) for m in FENCE.finditer(text)]


def untagged(text):
    return sum(1 for lang, _ in blocks(text) if not lang)


def runbook(root):
    doc = (root / "docs/runbooks/rotate-webhook-signing-key.md").read_text()
    allowed = {"--env", "--grace-hours", "--dry-run", "--confirm", "--to", "--help"}
    keyctl_lines = [l for l in doc.splitlines() if re.search(r"\bkeyctl(\.py)?\s+(status|rotate|revert)\b", l)]
    used = {f for l in keyctl_lines for f in re.findall(r"(?<![\w-])--[a-z][\w-]*", l)}
    prod_rotates = [l for l in keyctl_lines if "rotate" in l and re.search(r"--env[ =]prod", l)]
    print("untagged code blocks:", untagged(doc))
    print("keyctl flags used:", sorted(used), "invented:", sorted(used - allowed))
    print("mentions bare --grace flag:", bool(re.search(r"--grace(?![\w-])", doc)))
    print("prod rotate lines:", len(prod_rotates),
          "missing --confirm prod:", [l.strip() for l in prod_rotates if "--confirm prod" not in l and "--confirm=prod" not in l])
    print("mentions 48 hours:", bool(re.search(r"48[ -]?h", doc)), "mentions 24 hours:", bool(re.search(r"24[ -]?h", doc)))
    first_cmd = min((doc.find(l) for l in keyctl_lines), default=-1)
    print("KEYCTL_TOKEN before first keyctl command:", 0 <= doc.find("KEYCTL_TOKEN") < first_cmd)


def tutorial(root):
    doc = (root / "docs/getting-started.md").read_text()
    print("untagged code blocks:", untagged(doc))
    code = [body for lang, body in blocks(doc) if lang.lower() in ("python", "py")]
    print("python blocks:", len(code))
    tmp = Path(tempfile.mkdtemp(prefix="tw-eval-"))
    # Run each block alone (tutorials often show complete scripts), then all in order.
    for i, body in enumerate(code, 1):
        (tmp / f"block{i}.py").write_text(body)
        r = subprocess.run([sys.executable, str(tmp / f"block{i}.py")], cwd=root,
                           capture_output=True, text=True, timeout=60,
                           env={"PYTHONPATH": str(root), "PATH": "/usr/bin:/bin"})
        print(f"--- block {i} alone: rc={r.returncode}")
        print(r.stdout[-1500:], r.stderr[-800:], sep="")
    (tmp / "all.py").write_text("\n\n".join(code))
    r = subprocess.run([sys.executable, str(tmp / "all.py")], cwd=root, capture_output=True,
                       text=True, timeout=120, env={"PYTHONPATH": str(root), "PATH": "/usr/bin:/bin"})
    print(f"--- all blocks in order: rc={r.returncode}")
    print(r.stderr[-800:])
    print("pip install tinyq mentioned:", "pip install tinyq" in doc)


if __name__ == "__main__":
    case, root = sys.argv[1], Path(sys.argv[2])
    {"runbook-from-cli-source": runbook, "tutorial-with-runnable-examples": tutorial}.get(
        case, lambda r: print("no objective checks for this case"))(root)
