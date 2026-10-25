"""Check the code-review package and the behavior of its evaluation fixtures.

Run from any directory: python3 reviews/in-progress/code-review/check.py
These checks validate the sample's premises, not a reviewer's judgment.
The skill is installed on its own, so every link must stay inside its folder
and the bundled principles must match the coding-principles source text.
"""

import re
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
SKILL = ROOT / "skills/in-progress/code-review"
SOURCE = ROOT / "skills/in-progress/coding-principles"
SAMPLE = SKILL / "fixtures/sample"
sys.dont_write_bytecode = True
sys.path.insert(0, str(SAMPLE))

import checkout
import labels
import receipts
import sound
import test_checkout


class RecordingGateway:
    """Provider contract: accept first, then lose the first response."""

    def __init__(self):
        self.deliveries = []
        self.keys = set()
        self.lose_response = True

    def send(self, receipt_id, text, *, idempotency_key=None):
        if idempotency_key is None or idempotency_key not in self.keys:
            self.deliveries.append((receipt_id, text))
            if idempotency_key is not None:
                self.keys.add(idempotency_key)
        if self.lose_response:
            self.lose_response = False
            raise TimeoutError("Provider accepted; response lost")


class FixtureBehavior(unittest.TestCase):
    def test_label_contract_survives_direct_expression(self):
        for cents, expected in [(0, "USD 0.00"), (1, "USD 0.01"),
                                (1234, "USD 12.34"), (10000, "USD 100.00")]:
            with self.subTest(cents=cents):
                self.assertEqual(labels.amount_label(cents), expected)
                self.assertEqual(f"USD {cents // 100}.{cents % 100:02d}", expected)

    def test_shipping_implementations_currently_agree(self):
        for subtotal, expected in [(0, 500), (4999, 500), (5000, 0), (5001, 0)]:
            with self.subTest(subtotal=subtotal):
                self.assertEqual(checkout.quote_shipping(subtotal), expected)
                self.assertEqual(checkout.CheckoutCard().render(subtotal),
                                 f"<p>Shipping: {expected} cents</p>")

    def test_email_retry_duplicates_accepted_send(self):
        gateway = RecordingGateway()
        first = receipts.ReceiptJob("r1", "receipt")
        with self.assertRaises(TimeoutError):
            receipts.send_email(first, gateway)
        self.assertFalse(first.sent)
        receipts.send_email(receipts.ReceiptJob("r1", "receipt"), gateway)
        self.assertEqual(gateway.deliveries, [("r1", "receipt"), ("r1", "receipt")])

    def test_sms_retry_is_deduplicated_below_call_site(self):
        gateway = RecordingGateway()
        with self.assertRaises(TimeoutError):
            receipts.send_sms(receipts.ReceiptJob("r1", "receipt"), gateway)
        receipts.send_sms(receipts.ReceiptJob("r1", "receipt"), gateway)
        self.assertEqual(gateway.deliveries, [("r1", "receipt")])
        receipts.send_sms(receipts.ReceiptJob("r2", "another"), gateway)
        self.assertEqual(gateway.deliveries[-1], ("r2", "another"))
        self.assertEqual(len(gateway.deliveries), 2)

    def test_shipping_test_accepts_wrong_charge(self):
        # A mutation experiment, not a recommended test of checkout's implementation.
        with patch.object(checkout.CheckoutCard, "render",
                          return_value="<p>Shipping: 999999 cents</p>"):
            result = unittest.TestResult()
            test_checkout.CheckoutTests("test_shipping_charge_is_rendered").run(result)
        self.assertEqual(result.testsRun, 1)
        self.assertTrue(result.wasSuccessful(), result.errors + result.failures)

    def test_adapter_preserves_cents(self):
        vendor = SimpleNamespace(fetch_balance=lambda account: {"amount_minor": 1234})
        self.assertEqual(sound.BalanceGateway(vendor).balance_cents("a1"), 1234)

    def test_parser_preserves_order_duplicates_and_embedded_equals(self):
        self.assertEqual(sound.normalize_lines([
            "  # ignored ", " ", "a=1", " a = 2=3 ", "b =", "c=#value",
        ]), [("a", "1"), ("a", "2=3"), ("b", ""), ("c", "#value")])

    def test_parser_rejects_contract_violations(self):
        for line in ["no separator", "=value", "  =value"]:
            with self.subTest(line=line), self.assertRaises(ValueError):
                sound.normalize_lines([line])

    def test_optional_cache_failure_is_not_request_failure(self):
        def unavailable(key):
            raise TimeoutError("Cache unavailable")
        self.assertIsNone(sound.optional_hint(SimpleNamespace(get=unavailable), "hint"))
        self.assertEqual(sound.optional_hint(SimpleNamespace(get=lambda key: "h"), "hint"), "h")


class PackageIntegrity(unittest.TestCase):
    def test_skill_identity_and_concise_entrypoint(self):
        text = (SKILL / "SKILL.md").read_text()
        frontmatter, body = text.split("---", 2)[1:]
        self.assertIn("\nname: code-review\n", frontmatter)
        self.assertRegex(frontmatter, r"\ndescription: 'In progress: .+'\n")
        # A context budget for this skill, never a reviewed-code length rule.
        self.assertLessEqual(len(body.split()), 600)

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

    def test_bundled_principles_match_source(self):
        source = {}
        for line in (SOURCE / "SKILL.md").read_text().splitlines():
            if match := re.match(r"\*\*(.+?)\.\*\* (.+)", line):
                source[match[1]] = match[2]
        for reference in (SOURCE / "references").glob("*.md"):
            source.update(re.findall(r"^## (.+)\n(.+)\n", reference.read_text(), re.M))
        bundled = re.findall(r"^### (.+)\n(.+)\n", (SKILL / "references/principles.md").read_text(), re.M)
        self.assertTrue(bundled)
        for name, text in bundled:
            with self.subTest(principle=name):
                self.assertEqual(text, source.get(name), "copy the current source text")

    def test_every_reference_is_discoverable(self):
        body = (SKILL / "SKILL.md").read_text()
        for reference in (SKILL / "references").glob("*.md"):
            self.assertIn(f"references/{reference.name}", body)


if __name__ == "__main__":
    unittest.main(verbosity=2)
