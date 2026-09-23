"""Runtime configuration for Lendwise. Values may be overridden by environment."""
import os

DEFAULT_DAY_COUNT = os.environ.get("LENDWISE_DAY_COUNT", "30/360")

# Origination limits
MAX_APR = 0.36  # usury ceiling
MIN_TERM_MONTHS = 6
MAX_TERM_MONTHS = 84

# Collections
LATE_FEE_GRACE_DAYS = int(os.environ.get("LENDWISE_LATE_FEE_GRACE_DAYS", "10"))
DELINQUENCY_THRESHOLD_DAYS = 30

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://lendwise:fixture-password-not-real@localhost:5432/lendwise"
)
PAYMENT_GATEWAY_API_KEY = "fixture-not-a-real-key-0000"
