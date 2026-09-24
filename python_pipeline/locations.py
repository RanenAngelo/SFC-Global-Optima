"""STEPS 33–34 — Multi-Location Intelligence + Location-Specific Menu
Performance (SRS §1.2 Steps 33–34, FR xxxviii/xxxix).

Step 33: locations compared on revenue, profit, AOV, customers, repeat,
wastage, ratings, promo effectiveness, menu performance.
Step 34: the Step-10 classifier re-run per (item, restaurant) with the SAME
bands — location-specific Profit/Volume/Hidden/Low.

Reads processed_data/{fact_order_lines,fact_wastage,fact_ratings,feat_location}.parquet.
Writes processed_data/location_{intelligence,menu_class}.parquet +
reports/locations_report.json.

Usage: python -m python_pipeline.locations
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def run(proc: Path) -> dict:
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    fw = pd.read_parquet(proc / "fact_wastage.parquet")
    fr = pd.read_parquet(proc / "fact_ratings.parquet")

    g = comp.groupby(["restaurant_id", "restaurant_name", "city"])
    loc = g.agg(revenue=("line_total", "sum"), profit=("line_margin", "sum"),
                orders=("order_id", "nunique"), customers=("customer_id", "nunique"),
                promo_share=("discount_pct", lambda s: float((s > 0).mean()))).reset_index()
    loc["aov"] = (loc["revenue"] / loc["orders"]).round(2)
    loc["revenue"] = loc["revenue"].round(2)
    loc["profit"] = loc["profit"].round(2)
    buys = comp.groupby(["restaurant_id", "customer_id"])["order_id"].nunique().reset_index()
    loc["repeat_rate"] = loc["restaurant_id"].map(
        buys.groupby("restaurant_id")["order_id"].apply(lambda s: float((s >= 2).mean())).round(3))
    loc["wasted_qty"] = loc["restaurant_id"].map(
        fw.groupby("restaurant_id")["wasted_qty"].sum()).round(1)
    loc["avg_rating"] = loc["restaurant_id"].map(
        fr.groupby("restaurant_id")["rating"].mean()).round(3)
    top_cls = pd.read_parquet(proc / "menu_classified.parquet")[
        ["item_id", "performance_class"]]
    top = set(top_cls[top_cls["performance_class"] == "Profit Driver"]["item_id"])
    lr = comp.groupby(["restaurant_id", "item_id"])["line_total"].sum().reset_index()
    loc["profit_driver_revenue_share"] = loc["restaurant_id"].map(
        lr[lr["item_id"].isin(top)].groupby("restaurant_id")["line_total"].sum()
        / loc.set_index("restaurant_id")["revenue"]).round(3)
    loc.to_parquet(proc / "location_intelligence.parquet", index=False)

    # ---- Step 34: per-location classification with LOCAL bands -------------------
    # Global bands would make "high demand" unreachable inside one location
    # (global units are ~20x a single location's), so percentiles are computed
    # over the per-location rows themselves; rating anchors stay absolute.
    li = comp.groupby(["restaurant_id", "item_id", "item_name"]).agg(
        units_sold=("quantity", "sum"), revenue=("line_total", "sum"),
        contribution_margin=("line_margin", "sum"),
        buyers=("customer_id", "nunique")).reset_index()
    wli = fw.groupby(["restaurant_id", "item_id"])["wasted_qty"].sum()
    li["wasted_qty"] = li.set_index(["restaurant_id", "item_id"]).index.map(wli).fillna(0).values
    li["wastage_pct"] = (100 * li["wasted_qty"] / (li["units_sold"] + li["wasted_qty"])).round(2)
    rli = fr.groupby(["restaurant_id", "item_id"])["rating"].mean()
    li["avg_rating"] = li.set_index(["restaurant_id", "item_id"]).index.map(rli).values
    brep = comp.groupby(["restaurant_id", "item_id", "customer_id"]).size().reset_index(name="buys")
    brep = brep.groupby(["restaurant_id", "item_id"])["buys"].apply(lambda s: float((s >= 2).mean()))
    li["repeat_purchase_rate"] = li.set_index(["restaurant_id", "item_id"]).index.map(brep).fillna(0).values
    import config.thresholds as T
    bands = {
        "d_hi": float(li["units_sold"].quantile(T.MENU_HIGH_DEMAND_PCT / 100)),
        "p_hi": float(li["contribution_margin"].quantile(T.MENU_HIGH_PROFIT_PCT / 100)),
        "w_hi": float(li["wastage_pct"].quantile(T.MENU_HIGH_WASTAGE_PCT / 100)),
        "r_good": float(li["repeat_purchase_rate"].quantile(T.MENU_GOOD_REPEAT_PCT / 100)),
    }

    def classify(r):
        hi_d = r["units_sold"] >= bands["d_hi"]
        hi_p = r["contribution_margin"] >= bands["p_hi"]
        ok_w = not (pd.notna(r["wastage_pct"]) and r["wastage_pct"] >= bands["w_hi"])
        good_rate = pd.notna(r["avg_rating"]) and r["avg_rating"] >= 4.0
        poor_rate = pd.notna(r["avg_rating"]) and r["avg_rating"] < 3.0
        good_rep = r["repeat_purchase_rate"] >= bands["r_good"]
        if hi_d and hi_p and ok_w:
            return "Profit Driver"
        if hi_d:
            return "Volume Driver"
        if (hi_p or (good_rate and good_rep)) and ok_w and not poor_rate:
            return "Hidden Opportunity"
        return "Low Performer"

    li["location_class"] = li.apply(classify, axis=1)
    glob = pd.read_parquet(proc / "menu_classified.parquet")[["item_id", "performance_class"]]
    li = li.merge(glob, on="item_id", how="left")
    li["differs_from_global"] = li["location_class"] != li["performance_class"]
    li.to_parquet(proc / "location_menu_class.parquet", index=False)

    report = {"locations": len(loc),
              "top_location": loc.sort_values("revenue", ascending=False).iloc[0]["restaurant_id"],
              "class_mix": li["location_class"].value_counts().to_dict(),
              "location_class_rows": len(li),
              "differ_from_global": int(li["differs_from_global"].sum())}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "locations_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/locations_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
