class _Amount:
    def __init__(self, cents):
        self.cents = cents


class _Load:
    def run(self, context):
        context["amount"] = _Amount(context["input"])


class _Format:
    def run(self, context):
        amount = context["amount"].cents
        context["formatted"] = f"USD {amount // 100}.{amount % 100:02d}"


class _Result:
    def run(self, context):
        context["output"] = context["formatted"]


_STAGES = (_Load, _Format, _Result)


def amount_label(cents):
    context = {"input": cents}
    for stage in _STAGES:
        stage().run(context)
    return context["output"]
