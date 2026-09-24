"""STEP 35 — Ordering Channel Analysis (SRS §1.2 Step 35, FR xl).

Basket size, AOV, menu preferences, discounts, promos, peak periods,
profitability per channel. Reads processed_data/fact_order_lines.parquet.
Writes processed_data/channel_analysis.parquet + reports/channels_report.json.

Usage: python -m python_pipeline.channels
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
    g = comp.groupby("channel")
    ch = g.agg(orders=("order_id", "nunique"), revenue=("line_total", "sum"),
               profit=("line_margin", "sum"), avg_discount=("discount_pct", "mean"),
               promo_share=("discount_pct", lambda s: float((s > 0).mean()))).reset_index()
    ch["aov"] = (ch["revenue"] / ch["orders"]).round(2)
    ch["basket_size"] = (comp.groupby("channel").size().values / ch["orders"]).round(2)
    ch["revenue"] = ch["revenue"].round(2)
    ch["profit"] = ch["profit"].round(2)
    ch["margin_pct"] = (100 * ch["profit"] / ch["revenue"]).round(2)
    ch["peak_hour"] = ch["channel"].map(
        comp.groupby(["channel", "order_hour"])["order_id"].nunique().reset_index()
        .sort_values("order_id", ascending=False).drop_duplicates("channel")
        .set_index("channel")["order_hour"])
    fav = comp.groupby(["channel", "category_name"])["line_total"].sum().reset_index()
    ch["top_category"] = ch["channel"].map(
        fav.sort_values("line_total", ascending=False).drop_duplicates("channel")
        .set_index("channel")["category_name"])
    ch.to_parquet(proc / "channel_analysis.parquet", index=False)
    report = {"channels": ch.to_dict("records")}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "channels_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/channels_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
