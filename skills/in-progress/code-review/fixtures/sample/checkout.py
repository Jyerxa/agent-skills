def quote_shipping(subtotal_cents):
    return 0 if subtotal_cents >= 5000 else 500


class CheckoutCard:
    def render(self, subtotal_cents):
        shipping_cents = 500
        if subtotal_cents >= 5000:
            shipping_cents = 0
        return f"<p>Shipping: {shipping_cents} cents</p>"
