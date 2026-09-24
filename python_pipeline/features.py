"""Independent Python feature engineering (pandas) — same 22 SRS features as
spark_jobs/features.py, independently implemented (SRS Step 13).

Reads processed_data/fact_*.parquet (Python-integrated). Writes
processed_data/feat_{item,customer,location,channel,daily_demand}.parquet.

Usage: python -m python_pipeline.features
"""
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR  # noqa: E402

PEAK_HOURS = [12, 13, 14, 19, 20, 21]


def run(proc: Path) -> dict:
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    fr = pd.read_parquet(proc / "fact_ratings.parquet")
    fw = pd.read_parquet(proc / "fact_wastage.parquet")
    ph = pd.read_parquet(proc / "clean" / "pricing_history.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    max_date = pd.to_datetime(comp["order_datetime"]).max()
    report = {}

    # ---- feat_item ----
    g = comp.groupby(["item_id", "item_name", "category_id", "category_name"])
    item = g.agg(units_sold=("quantity", "sum"), revenue=("line_total", "sum"),
                 cost=("line_cost", "sum"), contribution_margin=("line_margin", "sum"),
                 order_frequency=("order_id", "nunique"), buyers=("customer_id", "nunique"),
                 avg_discount_pct=("discount_pct", "mean"),
                 first_sold=("order_date", "min"), last_sold=("order_date", "max")).reset_index()
    promo_rev = comp[comp["discount_pct"] > 0].groupby("item_id")["line_total"].sum()
    item["promotion_dependency"] = (item.set_index("item_id").index.map(promo_rev).fillna(0)
                                    / item["revenue"]).round(4).values
    item["profit_pct"] = (100 * item["contribution_margin"] / item["revenue"]).round(2)
    item["popularity"] = (item["revenue"] / comp["line_total"].sum()).round(6)
    buys = comp.groupby(["item_id", "customer_id"]).size().reset_index(name="buys")
    rep = buys.groupby("item_id")["buys"].apply(lambda s: (s >= 2).mean()).round(4)
    item["repeat_purchase_rate"] = item["item_id"].map(rep).fillna(0)
    fr = fr.copy()
    fr["review_date"] = pd.to_datetime(fr["review_date"])
    recent = fr[fr["review_date"] >= max_date - pd.Timedelta(days=90)].groupby("item_id")["rating"].mean()
    older = fr[fr["review_date"] < max_date - pd.Timedelta(days=90)].groupby("item_id")["rating"].mean()
    item["avg_rating"] = item["item_id"].map(fr.groupby("item_id")["rating"].mean()).round(3)
    item["n_ratings"] = item["item_id"].map(fr.groupby("item_id")["rating"].size())
    item["rating_trend"] = (item["item_id"].map(recent) - item["item_id"].map(older)).round(3)
    item["wasted_qty"] = item["item_id"].map(
        fw.groupby("item_id")["wasted_qty"].sum()).fillna(0).round(1)
    item["wastage_pct"] = (100 * item["wasted_qty"]
                            / (item["units_sold"] + item["wasted_qty"])).round(2)
    ph = ph.sort_values("effective_from")
    first_px = ph.groupby("item_id").first(numeric_only=False)
    last_px = ph.groupby("item_id").last(numeric_only=False)
    item["price_change_pct"] = item["item_id"].map(
        (100 * (last_px["price"] - first_px["price"]) / first_px["price"]).round(2))
    item.to_parquet(proc / "feat_item.parquet", index=False)
    report["feat_item"] = len(item)
    print(f"  pyfeat feat_item      {len(item):>7,} rows")

    # ---- feat_customer ----
    comp["has_promo"] = comp["line_promotion_id"].notna() | comp["order_promotion_id"].notna()
    comp["peak"] = comp["order_hour"].isin(PEAK_HOURS).astype(int)
    cg = comp.groupby("customer_id")
    cust = pd.DataFrame({
        "recency_days": (max_date - pd.to_datetime(cg["order_datetime"].max())).dt.days,
        "frequency": cg["order_id"].nunique(),
        "monetary": cg["line_total"].sum().round(2),
        "weekend_ratio": cg["is_weekend"].mean().round(4),
        "peak_hour_freq": cg["peak"].mean().round(4),
        "promo_sensitivity": cg["has_promo"].mean().round(4),
        "category_diversity": cg["category_id"].nunique(),
    }).reset_index()
    cust["aov"] = (cust["monetary"] / cust["frequency"]).round(2)
    cust["basket_size"] = (comp.groupby("customer_id")["quantity"].sum()
                           / cust.set_index("customer_id")["frequency"]).round(2).values
    cust["tenure_days"] = ((pd.to_datetime(cg["order_datetime"].max())
                            - pd.to_datetime(cg["order_datetime"].min())).dt.days.values)
    cust["favorite_category"] = (comp.groupby(["customer_id", "category_id"]).size()
                                 .reset_index().sort_values(0, ascending=False)
                                 .drop_duplicates("customer_id").set_index("customer_id")
                                 ["category_id"])
    cust["favorite_category"] = cust["customer_id"].map(cust["favorite_category"])
    cust["channel_preference"] = (comp.groupby(["customer_id", "channel"]).size()
                                  .reset_index().sort_values(0, ascending=False)
                                  .drop_duplicates("customer_id").set_index("customer_id")["channel"])
    cust["channel_preference"] = cust["customer_id"].map(cust["channel_preference"])

    def tod(h):
        return "morning" if h < 11 else ("lunch" if h < 16 else ("afternoon" if h < 19 else "dinner"))
    comp["tod"] = comp["order_hour"].map(tod)
    cust["time_of_day_pref"] = (comp.groupby(["customer_id", "tod"]).size()
                                .reset_index().sort_values(0, ascending=False)
                                .drop_duplicates("customer_id").set_index("customer_id")["tod"])
    cust["time_of_day_pref"] = cust["customer_id"].map(cust["time_of_day_pref"])
    cust.to_parquet(proc / "feat_customer.parquet", index=False)
    report["feat_customer"] = len(cust)
    print(f"  pyfeat feat_customer  {len(cust):>7,} rows")

    # ---- feat_location ----
    lg = comp.groupby(["restaurant_id", "restaurant_name", "city"])
    loc = lg.agg(revenue=("line_total", "sum"), profit=("line_margin", "sum"),
                 orders=("order_id", "nunique"), customers=("customer_id", "nunique")).reset_index()
    loc["revenue"] = loc["revenue"].round(2)
    loc["profit"] = loc["profit"].round(2)
    loc["aov"] = (loc["revenue"] / loc["orders"]).round(2)
    loc["location_performance"] = (loc["revenue"] / loc["revenue"].sum()).round(4)
    loc["wasted_qty"] = loc["restaurant_id"].map(
        fw.groupby("restaurant_id")["wasted_qty"].sum()).round(1)
    loc["avg_rating"] = loc["restaurant_id"].map(
        fr.groupby("restaurant_id")["rating"].mean()).round(3)
    loc.to_parquet(proc / "feat_location.parquet", index=False)
    report["feat_location"] = len(loc)
    print(f"  pyfeat feat_location  {len(loc):>7,} rows")

    # ---- feat_channel ----
    ch = comp.groupby("channel").agg(orders=("order_id", "nunique"),
                                     revenue=("line_total", "sum"),
                                     profit=("line_margin", "sum"),
                                     avg_discount=("discount_pct", "mean")).reset_index()
    ch["aov"] = (ch["revenue"] / ch["orders"]).round(2)
    ch["basket_size"] = (comp.groupby("channel").size().values / ch["orders"]).round(2)
    ch["revenue"] = ch["revenue"].round(2)
    ch["profit"] = ch["profit"].round(2)
    ch.to_parquet(proc / "feat_channel.parquet", index=False)
    report["feat_channel"] = len(ch)

    # ---- feat_daily_demand ----
    daily = comp.groupby(["item_id", "restaurant_id", "order_date"]).agg(
        units=("quantity", "sum"), revenue=("line_total", "sum"),
        orders=("order_id", "nunique")).reset_index()
    daily.to_parquet(proc / "feat_daily_demand.parquet", index=False)
    report["feat_daily_demand"] = len(daily)
    print(f"  pyfeat feat_daily_demand {len(daily):>7,} rows")
    return report


def main() -> dict:
    import json
    from config.settings import REPORTS_DIR
    report = run(PROCESSED_DIR)
    (REPORTS_DIR / "python_feature_report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    main()
