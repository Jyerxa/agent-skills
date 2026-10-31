"""Tests for check_fidelity.py. Run: python3 -m unittest test_check_fidelity"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_fidelity as cf  # noqa: E402

SOURCE = """# Title

Intro with `SaveAsync` and 25 ms of delay. See [Fowler](fowler.md) and https://example.com/cqrs.

## Implementation

```csharp
sealed class Order
{
    public int Version { get; private set; } // increments

    public void Ship() { Version++; }
}
```

## Trade-offs

Lag of 3 seconds is normal.
"""


def edited(code_lines=None, prose=None):
    code = code_lines or [
        "sealed class Order",
        "{",
        "    public int Version { get; private set; } // increments",
        "",
        "    public void Ship() { Version++; }",
        "}",
    ]
    body = prose if prose is not None else (
        "Intro: `SaveAsync` waits 25 ms. [Fowler](fowler.md) and https://example.com/cqrs agree. "
        "Lag of 3 seconds is normal."
    )
    return "# Title\n\n" + body + "\n\n```csharp\n" + "\n".join(code) + "\n```\n"


class CodeComparison(unittest.TestCase):
    def test_identical_code_passes(self):
        ok, lines = cf.report(SOURCE, edited())
        self.assertTrue(ok)
        self.assertTrue(any(line.startswith("OK code: 5 lines preserved") for line in lines), lines)

    def test_split_listing_with_prose_between_passes(self):
        split = ("# Title\n\nIntro `SaveAsync` 25 ms [Fowler](fowler.md) https://example.com/cqrs 3 seconds\n\n"
                 "```csharp\nsealed class Order\n{\n    public int Version { get; private set; } // increments\n```\n\n"
                 "Prose between segments.\n\n"
                 "```csharp\n    public void Ship() { Version++; }\n}\n```\n")
        ok, lines = cf.report(SOURCE, split)
        self.assertTrue(ok, lines)

    def test_altered_code_fails(self):
        changed = edited(code_lines=[
            "sealed class Order", "{",
            "    public int Version { get; private set; }",  # comment dropped
            "    public void Ship() { Version++; }", "}",
        ])
        ok, lines = cf.report(SOURCE, changed)
        self.assertFalse(ok)
        self.assertTrue(any("missing or altered" in line and "increments" in line for line in lines), lines)
        self.assertTrue(cf.report(SOURCE, changed, allow_code_changes=True)[0])

    def test_dropped_lines_fail_and_added_lines_are_named(self):
        ok, lines = cf.report(SOURCE, edited(code_lines=["sealed class Order", "{", "}", "int added;"]))
        self.assertFalse(ok)
        self.assertTrue(any("line not in source: int added;" in line for line in lines), lines)

    def test_reordered_code_is_a_warning(self):
        ok, lines = cf.report(SOURCE, edited(code_lines=[
            "    public void Ship() { Version++; }", "}",
            "sealed class Order", "{",
            "    public int Version { get; private set; } // increments",
        ]))
        self.assertTrue(ok)
        self.assertTrue(any(line.startswith("WARN code: same lines, different order") for line in lines), lines)

    def test_html_pre_blocks_count_as_code(self):
        html_source = "<h1>T</h1><p>x</p><pre><code>line one\nline two</code></pre>"
        html_edited = "<h1>T</h1><p>y</p><pre><code>line one\nline two</code></pre>"
        self.assertTrue(cf.report(html_source, html_edited)[0])
        self.assertFalse(cf.report(html_source, "<pre><code>line one</code></pre>")[0])


class ProseSignals(unittest.TestCase):
    def test_lost_identifier_number_and_link_are_warned(self):
        ok, lines = cf.report(SOURCE, edited(prose="Intro without the details."))
        self.assertTrue(ok)  # prose losses never fail the check
        joined = "\n".join(lines)
        self.assertIn("WARN inline code missing from edit: SaveAsync", joined)
        self.assertIn("WARN number missing from edit: 25 ms", joined)
        self.assertIn("WARN number missing from edit: 3", joined)
        self.assertIn("WARN link missing from edit: fowler.md", joined)
        self.assertIn("WARN link missing from edit: https://example.com/cqrs", joined)
        self.assertIn("INFO heading not kept verbatim: Implementation", joined)

    def test_numbers_inside_code_are_not_prose_numbers(self):
        source = "Text.\n\n```\nretry = 7\n```\n"
        ok, lines = cf.report(source, "Text.\n\n```\nretry = 7\n```\n")
        self.assertTrue(ok)
        self.assertNotIn("number missing", "\n".join(lines))


if __name__ == "__main__":
    unittest.main(verbosity=2)
