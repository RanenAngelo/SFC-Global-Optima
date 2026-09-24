"""STEP 4 — Data Quality Assessment (SRS §1.2 Step 4, FR xiv).

Detects all 14 SRS issue classes across the 11 tables. Read-only: never mutates
data (cleaning is Step 5). Writes reports/data_quality_report.json.

Usage: python -m spark_jobs.data_quality [--data-dir PATH]
"""
import argparse
import json
import sys
from pathlib import Path

from pyspark.sql import functions as F

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import DATA_DIR, REPORTS_DIR  # noqa: E402
from spark_jobs.io import load_tables  # noqa: E402
from spark_jobs.spark_session import get_spark  # noqa: E402


def _is_blank(col):
    return F.coalesce(F.trim(col.cast("string")), F.lit("")) == ""


def run(spark, data_dir: Path) -> dict:
    t = load_tables(spark, data_dir)
    rep = {}

    # 1) Missing values (null or blank) per column per table -------------------
    missing = {}
    for name, df in t.items():
        cols = {}
        for c in df.columns:
            n = df.filter(_is_blank(F.col(c))).count()
            if n:
                cols[c] = n
        if cols:
            missing[name] = cols
    rep["missing_values"] = missing

    # 2/3) Duplicate orders + duplicate order lines -----------------------------
    rep["duplicate_orders"] = int(
        t["orders"].groupBy("order_id").count().filter("count > 1")
        .select(F.sum("count")).first()[0] or 0)
    rep["duplicate_order_lines"] = int(
        t["order_items"].groupBy("order_item_id").count().filter("count > 1")
        .select(F.sum("count")).first()[0] or 0)

    # 4) Invalid menu prices ----------------------------------------------------
    rep["invalid_menu_prices"] = t["menu_items"].filter(
        "base_price IS NULL OR base_price <= 0").count()

    # 5) Negative quantities ----------------------------------------------------
    rep["negative_quantities"] = {
        "order_items": t["order_items"].filter("quantity < 0").count(),
        "inventory_consumed": t["inventory"].filter("consumed_qty < 0").count(),
        "inventory_stock": t["inventory"].filter("stock_level < 0").count(),
        "wastage_qty": t["wastage"].filter("wasted_qty < 0").count(),
    }

    # 6) Invalid dates -----------------------------------------------------------
    bad_dates = {}
    bad_dates["orders_null_datetime"] = t["orders"].filter("order_datetime IS NULL").count()
    bad_dates["pricing_end_before_start"] = t["pricing_history"].filter(
        "effective_to IS NOT NULL AND effective_from IS NOT NULL "
        "AND effective_to < effective_from").count()
    bad_dates["promo_end_before_start"] = t["promotions"].filter("end_date < start_date").count()
    bad_dates["ratings_null_date"] = t["ratings"].filter("review_date IS NULL").count()
    rep["invalid_dates"] = bad_dates

    # 7) Invalid ratings ----------------------------------------------------------
    rep["invalid_ratings"] = t["ratings"].filter("rating IS NULL OR rating < 1 OR rating > 5").count()

    # 8/9) Missing customer IDs / menu IDs ----------------------------------------
    rep["missing_customer_ids"] = t["orders"].filter(_is_blank(F.col("customer_id"))).count()
    rep["missing_menu_ids"] = t["order_items"].filter(_is_blank(F.col("item_id"))).count()

    # 10/15) Invalid restaurant IDs / location references --------------------------
    rest_ids = [r[0] for r in t["restaurants"].select("restaurant_id").distinct().collect()]
    bad_rest = {}
    for tbl, col in [("orders", "restaurant_id"), ("order_items", None),
                     ("ratings", "restaurant_id"), ("inventory", "restaurant_id"),
                     ("wastage", "restaurant_id")]:
        if col is None:
            continue
        bad_rest[tbl] = t[tbl].filter(
            (~F.col(col).isin(rest_ids)) & (~_is_blank(F.col(col)))).count()
    known_cities = [r[0] for r in t["restaurants"].select("city").distinct().collect()]
    bad_rest["customers_unknown_home_city"] = t["customers"].filter(
        (~F.col("home_city").isin(known_cities)) & (~_is_blank(F.col("home_city")))).count()
    rep["invalid_restaurant_ids"] = bad_rest

    # FK integrity (all documented relationships) ----------------------------------
    from spark_jobs import schemas as S
    fk_bad = {}
    for child_col, parent in S.FOREIGN_KEYS.items():
        child, col = child_col.split(".")
        parent_pk = S.TABLES[parent][2]
        pks = [r[0] for r in t[parent].select(parent_pk).distinct().collect()]
        n = t[child].filter((~F.col(col).isin(pks)) & (~_is_blank(F.col(col)))).count()
        if n:
            fk_bad[child_col] = n
    rep["fk_violations"] = fk_bad

    # 11) Impossible wastage quantities --------------------------------------------
    q = t["wastage"].filter("wasted_qty IS NOT NULL").approxQuantile(
        "wasted_qty", [0.25, 0.75], 0.01)
    upper = (q[1] + 3 * (q[1] - q[0])) if q and q[1] > q[0] else 200.0
    rep["impossible_wastage"] = {
        "rule": f"wasted_qty <= 0 OR wasted_qty > {upper:.1f} (Q3 + 3*IQR)",
        "count": t["wastage"].filter(
            (F.col("wasted_qty") <= 0) | (F.col("wasted_qty") > upper)).count(),
    }

    # 12) Incorrect discounts -------------------------------------------------------
    rep["incorrect_discounts"] = {
        "discount_out_of_range": t["order_items"].filter(
            "discount_pct IS NULL OR discount_pct < 0 OR discount_pct > 1").count(),
        "line_total_mismatch": t["order_items"].filter(
            "quantity IS NOT NULL AND unit_price IS NOT NULL AND discount_pct IS NOT NULL "
            "AND abs(line_total - quantity*unit_price*(1-discount_pct)) > 0.05").count(),
    }

    # 13) Cancelled transactions (informational) --------------------------------------
    rep["cancelled_transactions"] = t["orders"].filter("status = 'Cancelled'").count()
    rep["cancelled_share_pct"] = round(
        100 * rep["cancelled_transactions"] / max(t["orders"].count(), 1), 2)

    # 14) Inconsistent units ----------------------------------------------------------
    rep["inconsistent_units"] = {
        "negative_unit_price": t["order_items"].filter("unit_price < 0").count(),
        "negative_total_amount": t["orders"].filter("total_amount < 0").count(),
        "line_total_negative": t["order_items"].filter("line_total < 0").count(),
    }

    rep["row_counts"] = {name: df.count() for name, df in t.items()}
    return rep


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(DATA_DIR))
    args = ap.parse_args()
    spark = get_spark("dineiq-dq")
    try:
        rep = run(spark, Path(args.data_dir))
    finally:
        spark.stop()
    out = REPORTS_DIR / "data_quality_report.json"
    out.write_text(json.dumps(rep, indent=2))
    print(json.dumps({k: v for k, v in rep.items() if k != "missing_values"}, indent=2))
    print(f"Report -> {out}")
    return rep


if __name__ == "__main__":
    main()
