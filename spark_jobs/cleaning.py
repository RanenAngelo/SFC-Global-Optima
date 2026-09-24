"""STEP 5 — Data Cleaning (SRS §1.2 Step 5, FR xv).

Applies documentation/DATA_QUALITY_RULES.md on Spark. Every rejected row goes
to quarantine with a reason code; every correction is counted. Nothing is
silently discarded.

Writes: parquet_data/clean/*.parquet, parquet_data/quarantine/*.parquet,
        reports/cleaning_report.json

Usage: python -m spark_jobs.cleaning [--data-dir PATH]
"""
import argparse
import json
import sys
from pathlib import Path

from pyspark.sql import functions as F
from pyspark.sql.window import Window

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import DATA_DIR, PARQUET_DIR, REPORTS_DIR  # noqa: E402
from spark_jobs.io import load_tables, write_parquet  # noqa: E402
from spark_jobs.spark_session import get_spark  # noqa: E402


def _blank(col):
    return F.coalesce(F.trim(col.cast("string")), F.lit("")) == ""


def _dedup(df, pk):
    w = Window.partitionBy(pk).orderBy(F.monotonically_increasing_id())
    return (df.withColumn("_rn", F.row_number().over(w)),
            F.col("_rn") > 1)


def run(spark, data_dir: Path) -> dict:
    t = load_tables(spark, data_dir)
    clean_dir, quar_dir = PARQUET_DIR / "clean", PARQUET_DIR / "quarantine"
    report, decisions = {"tables": {}}, []

    def decide(table, action, rule, n):
        if n:
            decisions.append({"table": table, "action": action, "rule": rule, "rows": n})

    rest_ids = [r[0] for r in t["restaurants"].select("restaurant_id").distinct().collect()]
    cust_ids = [r[0] for r in t["customers"].select("customer_id").distinct().collect()]
    item_ids = [r[0] for r in t["menu_items"].select("item_id").distinct().collect()]
    order_ids = [r[0] for r in t["orders"].select("order_id").distinct().collect()]
    promo_ids = [r[0] for r in t["promotions"].select("promotion_id").distinct().collect()]
    cat_ids = [r[0] for r in t["menu_categories"].select("category_id").distinct().collect()]

    # ---- orders -------------------------------------------------------------
    o, dup = _dedup(t["orders"], "order_id")
    o = o.withColumn("_reason",
                     F.when(dup, "DUP_PK")
                     .when(_blank(F.col("customer_id")), "MISSING_FK")
                     .when(~F.col("customer_id").isin(cust_ids), "BAD_FK")
                     .when(~F.col("restaurant_id").isin(rest_ids), "BAD_FK")
                     .when(F.col("total_amount") < 0, "NEG_MONEY")
                     .when(F.col("order_datetime").isNull(), "BAD_DATE"))
    oq, o = o.filter("_reason IS NOT NULL").drop("_rn"), o.filter("_reason IS NULL").drop("_rn", "_reason")
    for code in ["DUP_PK", "MISSING_FK", "BAD_FK", "NEG_MONEY", "BAD_DATE"]:
        decide("orders", "quarantine", code, oq.filter(f"_reason = '{code}'").count())

    # ---- order_items ----------------------------------------------------------
    oi, dup = _dedup(t["order_items"], "order_item_id")
    oi = oi.withColumn("_reason",
                       F.when(dup, "DUP_PK")
                       .when(_blank(F.col("item_id")), "MISSING_FK")
                       .when(_blank(F.col("order_id")), "MISSING_FK")
                       .when(~F.col("item_id").isin(item_ids), "BAD_FK")
                       .when(~F.col("order_id").isin(order_ids), "BAD_FK")
                       .when(F.col("quantity").isNull() | (F.col("quantity") <= 0), "NEG_QTY")
                       .when(F.col("discount_pct").isNull()
                             | (F.col("discount_pct") < 0) | (F.col("discount_pct") > 1),
                             "BAD_DISCOUNT"))
    oiq, oi = oi.filter("_reason IS NOT NULL").drop("_rn"), oi.filter("_reason IS NULL").drop("_rn", "_reason")
    for code in ["DUP_PK", "MISSING_FK", "BAD_FK", "NEG_QTY", "BAD_DISCOUNT"]:
        decide("order_items", "quarantine", code, oiq.filter(f"_reason = '{code}'").count())
    # correct recomputable line totals (TOTAL_MISMATCH)
    mismatch = oi.filter("abs(line_total - quantity*unit_price*(1-discount_pct)) > 0.05").count()
    oi = oi.withColumn("line_total",
                       F.round(F.col("quantity") * F.col("unit_price")
                               * (1 - F.col("discount_pct")), 2))
    decide("order_items", "correct", "TOTAL_MISMATCH", mismatch)

    # ---- menu_items -------------------------------------------------------------
    mi = t["menu_items"].withColumn(
        "_reason",
        F.when(F.col("base_price").isNull() | (F.col("base_price") <= 0), "BAD_PRICE")
        .when(~F.col("category_id").isin(cat_ids), "BAD_FK"))
    miq, mi = mi.filter("_reason IS NOT NULL"), mi.filter("_reason IS NULL").drop("_reason")
    decide("menu_items", "quarantine", "BAD_PRICE/BAD_FK", miq.count())

    # ---- ratings ------------------------------------------------------------------
    r = t["ratings"].withColumn(
        "_reason",
        F.when(F.col("rating").isNull() | (F.col("rating") < 1) | (F.col("rating") > 5), "BAD_RATING")
        .when(~F.col("item_id").isin(item_ids), "BAD_FK")
        .when(F.col("review_date").isNull(), "BAD_DATE"))
    rq, r = r.filter("_reason IS NOT NULL"), r.filter("_reason IS NULL").drop("_reason")
    decide("ratings", "quarantine", "BAD_RATING/BAD_FK/BAD_DATE", rq.count())

    # ---- customers (impute city) ------------------------------------------------------
    n_city = t["customers"].filter(_blank(F.col("home_city"))).count()
    c = t["customers"].withColumn(
        "home_city", F.when(_blank(F.col("home_city")), "Unknown").otherwise(F.col("home_city")))
    decide("customers", "correct", "IMPUTE_CITY", n_city)
    c, _cdup = _dedup(c, "customer_id")
    cq, c = c.filter("_rn > 1").drop("_rn"), c.filter("_rn = 1").drop("_rn")
    decide("customers", "quarantine", "DUP_PK", cq.count())

    # ---- pricing_history --------------------------------------------------------------
    ph = t["pricing_history"].withColumn(
        "_reason",
        F.when(F.col("effective_to").isNotNull()
               & F.col("effective_from").isNotNull()
               & (F.col("effective_to") < F.col("effective_from")), "BAD_DATE")
        .when(F.col("price").isNull() | (F.col("price") <= 0), "BAD_PRICE")
        .when(~F.col("item_id").isin(item_ids), "BAD_FK"))
    phq, ph = ph.filter("_reason IS NOT NULL"), ph.filter("_reason IS NULL").drop("_reason")
    decide("pricing_history", "quarantine", "BAD_DATE/BAD_PRICE/BAD_FK", phq.count())

    # ---- wastage --------------------------------------------------------------------------
    q = t["wastage"].filter("wasted_qty IS NOT NULL").approxQuantile("wasted_qty", [0.25, 0.75], 0.01)
    bound = (q[1] + 3 * (q[1] - q[0])) if q and q[1] > q[0] else 200.0
    w = t["wastage"].withColumn(
        "_reason",
        F.when(F.col("wasted_qty").isNull() | (F.col("wasted_qty") <= 0)
               | (F.col("wasted_qty") > bound), "EXTREME_WASTE")
        .when(~F.col("item_id").isin(item_ids), "BAD_FK")
        .when(~F.col("restaurant_id").isin(rest_ids), "BAD_FK"))
    wq, w = w.filter("_reason IS NOT NULL"), w.filter("_reason IS NULL").drop("_reason")
    decide("wastage", "quarantine", f"EXTREME_WASTE(>{bound:.1f})/BAD_FK", wq.count())

    # ---- inventory ----------------------------------------------------------------------------
    inv = t["inventory"].withColumn(
        "_reason",
        F.when((F.col("stock_level") < 0) | (F.col("consumed_qty") < 0)
               | (F.col("replenished_qty") < 0), "NEG_STOCK")
        .when(~F.col("item_id").isin(item_ids), "BAD_FK")
        .when(~F.col("restaurant_id").isin(rest_ids), "BAD_FK"))
    invq, inv = inv.filter("_reason IS NOT NULL"), inv.filter("_reason IS NULL").drop("_reason")
    decide("inventory", "quarantine", "NEG_STOCK/BAD_FK", invq.count())

    # ---- promotions / restaurants / categories (validate only) ------------------------------------
    p = t["promotions"].withColumn(
        "_reason", F.when(F.col("end_date") < F.col("start_date"), "BAD_DATE"))
    pq, p = p.filter("_reason IS NOT NULL"), p.filter("_reason IS NULL").drop("_reason")
    decide("promotions", "quarantine", "BAD_DATE", pq.count())

    cleaned = {"restaurants": t["restaurants"], "menu_categories": t["menu_categories"],
               "menu_items": mi, "pricing_history": ph, "customers": c, "promotions": p,
               "orders": o, "order_items": oi, "ratings": r, "inventory": inv, "wastage": w}
    quarantined = {"orders": oq, "order_items": oiq,
                   "menu_items": miq, "ratings": rq, "customers": cq,
                   "pricing_history": phq, "wastage": wq, "inventory": invq, "promotions": pq}
    for name, df in cleaned.items():
        write_parquet(df, clean_dir / f"{name}.parquet")
        nq = quarantined[name].count() if name in quarantined else 0
        if name in quarantined and nq:
            write_parquet(quarantined[name], quar_dir / f"{name}.parquet")
        report["tables"][name] = {"accepted": df.count(), "rejected": nq}
        print(f"  clean {name:16s} accepted={report['tables'][name]['accepted']:>7,} "
              f"rejected={nq:>6,}")
    report["decisions"] = decisions
    report["wastage_bound"] = bound
    return report


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(DATA_DIR))
    args = ap.parse_args()
    spark = get_spark("dineiq-clean")
    try:
        report = run(spark, Path(args.data_dir))
    finally:
        spark.stop()
    out = REPORTS_DIR / "cleaning_report.json"
    out.write_text(json.dumps(report, indent=2, default=str))
    print(f"Report -> {out}")
    return report


if __name__ == "__main__":
    main()
