"""Decimal-safe money helpers (user §9/§39). All financial aggregations MUST
use these — never raw float sums for monetary totals."""
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")


def d(value) -> Decimal:
    """Coerce anything numeric/None to Decimal (None -> 0)."""
    if value is None or value == "":
        return Decimal("0")
    return Decimal(str(value))


def money(value) -> Decimal:
    """Round to 2dp (half up)."""
    return d(value).quantize(CENT, rounding=ROUND_HALF_UP)


def total(values) -> Decimal:
    s = sum((d(v) for v in values), Decimal("0"))
    return s.quantize(CENT, rounding=ROUND_HALF_UP)


def ratio(numer, denom, *, percent=False, default=None):
    """Zero-safe division. Returns float (or default) — never raises."""
    den = d(denom)
    if den == 0:
        return default
    r = d(numer) / den
    if percent:
        r *= 100
    return float(r)
