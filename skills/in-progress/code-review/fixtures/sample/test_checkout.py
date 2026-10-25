import unittest

from checkout import CheckoutCard


class CheckoutTests(unittest.TestCase):
    def test_shipping_charge_is_rendered(self):
        html = CheckoutCard().render(2000)
        self.assertIsInstance(html, str)
        self.assertTrue(html)


if __name__ == "__main__":
    unittest.main()
