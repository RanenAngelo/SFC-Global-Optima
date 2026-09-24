"""STEP 7 — Feature Engineering (SRS §1.2 Step 7, FR xix).

Builds every SRS-listed analytical feature from the integrated star schema:
item revenue/cost/contribution margin/profit %, order frequency, popularity,
repeat-purchase rate, average rating, rating trend, wastage %, promotion
dependency, discount %, customer recency/frequency/monetary, AOV, peak-hour
frequency, weekend ratio, location performance, channel preference, basket
size, price-change %.

Writes: parquet_data/processed/feat_{item,customer,location,channel,daily_demand}.parquet
        + reports/feature_report.json

Usage: python -m spark_jobs.features
"""
import argparse
import json
import sys
from pathlib import Path

from pyspark.sql import functions as F

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PARQUET_DIR, REPORTS_DIR  # noqa: E402
from spark_jobs.io import write_parquet  # noqa: E402
from spark_jobs.spark_session import get_spark  # noqa: E402

PEAK_HOURS = [12, 13, 14, 19, 20, 21]


def run(spark, proc: Path) -> dict:
    fol = spark.read.parquet(str(proc / "fact_order_lines.parquet"))
    fr = spark.read.parquet(str(proc / "fact_ratings.parquet"))
    fw = spark.read.parquet(str(proc / "fact_wastage.parquet"))
    ph = spark.read.parquet(str(PARQUET_DIR / "clean" / "pricing_history.parquet"))
    comp = fol.filter("status = 'Completed'")  # finance features use completed sales only
    max_date = comp.select(F.max("order_date")).first()[0]
    report = {}

    # ---- feat_item -----------------------------------------------------------------
    item_sales = comp.groupBy("item_id", "item_name", "category_id", "category_name").agg(
        F.sum("quantity").alias("units_sold"),
        F.round(F.sum("line_total"), 2).alias("revenue"),
        F.round(F.sum("line_cost"), 2).alias("cost"),
        F.round(F.sum("line_margin"), 2).alias("contribution_margin"),
        F.countDistinct("order_id").alias("order_frequency"),
        F.countDistinct("customer_id").alias("buyers"),
        F.round(F.avg("discount_pct"), 4).alias("avg_discount_pct"),
        F.round(F.sum(F.when(F.col("discount_pct") > 0, F.col("line_total")).otherwise(0))
                / F.sum("line_total"), 4).alias("promotion_dependency"),
        F.min("order_date").alias("first_sold"), F.max("order_date").alias("last_sold"))
    total_rev = comp.select(F.sum("line_total")).first()[0] or 1.0
    item_sales = item_sales.withColumn(
        "profit_pct", F.round(100 * F.col("contribution_margin") / F.col("revenue"), 2))
    item_sales = item_sales.withColumn("popularity", F.round(F.col("revenue") / F.lit(total_rev), 6))

    cust_item = comp.groupBy("item_id", "customer_id").agg(F.count("*").alias("buys"))
    repeat = cust_item.groupBy("item_id").agg(
        F.round(F.avg(F.when(F.col("buys") >= 2, 1).otherwise(0)), 4).alias("repeat_purchase_rate"))

    rate_agg = fr.groupBy("item_id").agg(
        F.round(F.avg("rating"), 3).alias("avg_rating"), F.count("*").alias("n_ratings"),
        F.round(F.avg(F.when(F.col("review_date") >= F.date_sub(F.lit(max_date), 90),
                             F.col("rating"))), 3).alias("rating_recent"),
        F.round(F.avg(F.when(F.col("review_date") < F.date_sub(F.lit(max_date), 90),
                             F.col("rating"))), 3).alias("rating_older"))
    rate_agg = rate_agg.withColumn(
        "rating_trend", F.round(F.col("rating_recent") - F.col("rating_older"), 3))

    waste_agg = fw.groupBy("item_id").agg(F.round(F.sum("wasted_qty"), 1).alias("wasted_qty"))
    feat_item = (item_sales.join(repeat, "item_id", "left").join(rate_agg, "item_id", "left")
                 .join(waste_agg, "item_id", "left")
                 .fillna({"repeat_purchase_rate": 0.0, "wasted_qty": 0.0}))
    feat_item = feat_item.withColumn(
        "wastage_pct",
        F.round(100 * F.col("wasted_qty") / (F.col("units_sold") + F.col("wasted_qty")), 2))

    price_span = ph.groupBy("item_id").agg(
        F.min_by("price", "effective_from").alias("first_price"),
        F.max_by("price", "effective_from").alias("last_price"))
    price_span = price_span.withColumn(
        "price_change_pct",
        F.round(100 * (F.col("last_price") - F.col("first_price")) / F.col("first_price"), 2))
    feat_item = feat_item.join(price_span, "item_id", "left")
    write_parquet(feat_item, proc / "feat_item.parquet")
    report["feat_item"] = feat_item.count()
    print(f"  features feat_item      {report['feat_item']:>7,} rows")

    # ---- feat_customer ------------------------------------------------------------------
    fc = comp.groupBy("customer_id").agg(
        F.datediff(F.lit(max_date), F.max("order_date")).alias("recency_days"),
        F.countDistinct("order_id").alias("frequency"),
        F.round(F.sum("line_total"), 2).alias("monetary"),
        F.round(F.sum("line_total") / F.countDistinct("order_id"), 2).alias("aov"),
        F.round(F.avg("is_weekend"), 4).alias("weekend_ratio"),
        F.round(F.avg(F.when(F.col("order_hour").isin(PEAK_HOURS), 1).otherwise(0)), 4
                ).alias("peak_hour_freq"),
        F.round(F.avg(F.when((F.col("line_promotion_id").isNotNull())
                             | (F.col("order_promotion_id").isNotNull()), 1).otherwise(0)), 4
                ).alias("promo_sensitivity"),
        F.round(F.sum("quantity") / F.countDistinct("order_id"), 2).alias("basket_size"),
        F.countDistinct("category_id").alias("category_diversity"),
        F.datediff(F.max("order_date"), F.min("order_date")).alias("tenure_days"))
    fav_cat = (comp.groupBy("customer_id", "category_id").count()
               .withColumn("rn", F.row_number().over(
                   __import__("pyspark.sql.window", fromlist=["Window"]).Window
                   .partitionBy("customer_id").orderBy(F.desc("count"))))
               .filter("rn = 1").select("customer_id", F.col("category_id").alias("favorite_category")))
    chan_pref = (comp.groupBy("customer_id", "channel").count()
                 .withColumn("rn", F.row_number().over(
                     __import__("pyspark.sql.window", fromlist=["Window"]).Window
                     .partitionBy("customer_id").orderBy(F.desc("count"))))
                 .filter("rn = 1").select("customer_id", F.col("channel").alias("channel_preference")))
    tod = comp.withColumn("tod", F.when(F.col("order_hour") < 11, "morning")
                          .when(F.col("order_hour") < 16, "lunch")
                          .when(F.col("order_hour") < 19, "afternoon").otherwise("dinner"))
    tod_pref = (tod.groupBy("customer_id", "tod").count()
                .withColumn("rn", F.row_number().over(
                    __import__("pyspark.sql.window", fromlist=["Window"]).Window
                    .partitionBy("customer_id").orderBy(F.desc("count"))))
                .filter("rn = 1").select("customer_id", F.col("tod").alias("time_of_day_pref")))
    feat_customer = fc.join(fav_cat, "customer_id", "left").join(chan_pref, "customer_id", "left") \
        .join(tod_pref, "customer_id", "left")
    write_parquet(feat_customer, proc / "feat_customer.parquet")
    report["feat_customer"] = feat_customer.count()
    print(f"  features feat_customer  {report['feat_customer']:>7,} rows")

    # ---- feat_location -------------------------------------------------------------------
    fl = comp.groupBy("restaurant_id", "restaurant_name", "city").agg(
        F.round(F.sum("line_total"), 2).alias("revenue"),
        F.round(F.sum("line_margin"), 2).alias("profit"),
        F.round(F.sum("line_total") / F.countDistinct("order_id"), 2).alias("aov"),
        F.countDistinct("order_id").alias("orders"),
        F.countDistinct("customer_id").alias("customers"))
    fl = fl.withColumn("location_performance",
                       F.round(F.col("revenue") / F.sum("revenue").over(
                           __import__("pyspark.sql.window", fromlist=["Window"]).Window
                           .partitionBy(F.lit(1))), 4))
    wloc = fw.groupBy("restaurant_id").agg(F.round(F.sum("wasted_qty"), 1).alias("wasted_qty"))
    rloc = fr.groupBy("restaurant_id").agg(F.round(F.avg("rating"), 3).alias("avg_rating"))
    feat_location = fl.join(wloc, "restaurant_id", "left").join(rloc, "restaurant_id", "left")
    write_parquet(feat_location, proc / "feat_location.parquet")
    report["feat_location"] = feat_location.count()
    print(f"  features feat_location  {report['feat_location']:>7,} rows")

    # ---- feat_channel ----------------------------------------------------------------------
    fch = comp.groupBy("channel").agg(
        F.countDistinct("order_id").alias("orders"),
        F.round(F.sum("line_total"), 2).alias("revenue"),
        F.round(F.sum("line_margin"), 2).alias("profit"),
        F.round(F.sum("line_total") / F.countDistinct("order_id"), 2).alias("aov"),
        F.round(F.count("*") / F.countDistinct("order_id"), 2).alias("basket_size"),
        F.round(F.avg("discount_pct"), 4).alias("avg_discount"))
    write_parquet(fch, proc / "feat_channel.parquet")
    report["feat_channel"] = fch.count()
    print(f"  features feat_channel   {report['feat_channel']:>7,} rows")

    # ---- feat_daily_demand (item x restaurant x date; feeds forecasting) ----------------------
    daily = comp.groupBy("item_id", "restaurant_id", "order_date").agg(
        F.sum("quantity").alias("units"),
        F.round(F.sum("line_total"), 2).alias("revenue"),
        F.countDistinct("order_id").alias("orders"))
    write_parquet(daily, proc / "feat_daily_demand.parquet", partition_by=["restaurant_id"])
    report["feat_daily_demand"] = daily.count()
    print(f"  features feat_daily_demand {report['feat_daily_demand']:>7,} rows")
    return report


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--proc", default=str(PARQUET_DIR / "processed"))
    args = ap.parse_args()
    spark = get_spark("dineiq-features")
    try:
        report = run(spark, Path(args.proc))
    finally:
        spark.stop()
    out = REPORTS_DIR / "feature_report.json"
    out.write_text(json.dumps(report, indent=2, default=str))
    print(f"Report -> {out}")
    return report


if __name__ == "__main__":
    main()
