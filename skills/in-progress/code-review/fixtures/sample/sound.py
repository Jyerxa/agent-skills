class BalanceGateway:
    """Keep the vendor's transport name out of callers."""

    def __init__(self, vendor):
        self.vendor = vendor

    def balance_cents(self, account_id):
        return self.vendor.fetch_balance(account_id)["amount_minor"]


def page_caption(count):
    return f"{count} items"


def export_caption(count):
    return f"{count} items"


def normalize_lines(lines):
    records = []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator:
            raise ValueError("Expected key=value")
        key = key.strip()
        if not key:
            raise ValueError("Expected a non-empty key")
        records.append((key, value.strip()))
    return records


def optional_hint(cache, key):
    try:
        return cache.get(key)
    except TimeoutError:
        return None
