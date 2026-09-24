"""STEP 9 — Menu Profitability Analysis (SRS §1.2 Step 9, FR xx).

Per-item 10 dimensions: quantity sold, revenue, cost, contribution margin,
profit %, rating, repeat-purchase rate, wastage %, promotion dependency,
sales trend. Global totals use Decimal-safe aggregation (src/common/money).

Reads processed_data/{feat_item,fact_order_lines}.parquet.
Writes processed_data/menu_performance.parquet + reports/profitability_report.json.

Usage: python -m python_pipeline.profitability
"""
import json
import sys
from decimal import Decimal
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402
from src.common.money import money, ratio  # noqa: E402


def run(proc: Path) -> dict:
    item = pd.read_parquet(proc / "feat_item.parquet")
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    comp["order_month"] = pd.to_datetime(comp["order_datetime"]).dt.strftime("%Y-%m")

    # Sales trend: % change of last 3 full months vs prior 3 months (per item)
    months = sorted(comp["order_month"].unique())
    recent, prior = set(months[-3:]), set(months[-6:-3])
    rev_recent = comp[comp["order_month"].isin(recent)].groupby("item_id")["line_total"].sum()
    rev_prior = comp[comp["order_month"].isin(prior)].groupby("item_id")["line_total"].sum()
    trend = ((rev_recent - rev_prior) / rev_prior.replace(0, pd.NA) * 100).round(1)
    perf = item.copy()
    perf["sales_trend_pct"] = perf["item_id"].map(trend)
    perf["sales_trend"] = perf["sales_trend_pct"].map(
        lambda v: "up" if pd.notna(v) and v > 10 else ("down" if pd.notna(v) and v < -10 else "flat"))

    # Weekend/seasonal/location helpers for Step 11 (computed here, flagged in classify)
    wk = comp.groupby("item_id")["is_weekend"].mean()
    perf["weekend_share"] = perf["item_id"].map(wk).round(3)
    im = comp.groupby(["item_id", "order_month"])["line_total"].sum().reset_index()
    cv = im.groupby("item_id")["line_total"].apply(
        lambda s: float(s.std() / s.mean()) if s.mean() else 0.0)
    perf["monthly_cv"] = perf["item_id"].map(cv).round(3)

    def _spike_months(s):
        # Seasonal/peak-month shape: months whose detrended residual exceeds 2σ.
        # Pure growth yields no spikes; isolated bursts do. Returns spike count.
        import numpy as np
        y = s.values.astype(float)
        if len(y) < 6 or y.mean() == 0:
            return 0
        x = np.arange(len(y))
        slope, intercept = np.polyfit(x, y, 1)
        resid = y - (slope * x + intercept)
        sd = resid.std()
        if sd == 0:
            return 0
        return int((resid > 2 * sd).sum())
    perf["spike_months"] = perf["item_id"].map(
        im.groupby("item_id")["line_total"].apply(_spike_months))
    perf["months_active"] = perf["item_id"].map(im.groupby("item_id")["order_month"].nunique())
    perf["max_month_share"] = perf["item_id"].map(
        (im.groupby("item_id")["line_total"].max()
         / im.groupby("item_id")["line_total"].sum()).round(3))
    il = comp.groupby(["item_id", "restaurant_id"])["line_total"].sum().reset_index()
    lcv = il.groupby("item_id")["line_total"].apply(
        lambda s: float(s.std() / s.mean()) if s.mean() else 0.0)
    perf["location_cv"] = perf["item_id"].map(lcv).round(3)

    perf.to_parquet(proc / "menu_performance.parquet", index=False)

    revenue = money(Decimal(str(comp["line_total"].sum())))
    cost = money(Decimal(str(comp["line_cost"].sum())))
    profit = money(revenue - cost)
    report = {
        "items": len(perf),
        "total_revenue": float(revenue), "total_cost": float(cost),
        "total_profit": float(profit),
        "profit_margin_pct": round(ratio(profit, revenue, percent=True) or 0, 2),
        "total_orders": int(comp["order_id"].nunique()),
        "aov": float(money(Decimal(str(comp["line_total"].sum()))
                            / Decimal(str(comp["order_id"].nunique())))),
        "months": months,
    }
    print(json.dumps(report, indent=2))
    return {"perf": perf, "report": report}


def main() -> dict:
    perf, report = None, None
    out = run(PROCESSED_DIR)
    (REPORTS_DIR / "profitability_report.json").write_text(
        json.dumps(out["report"], indent=2))
    print(f"Report -> reports/profitability_report.json")
    return out["report"]


if __name__ == "__main__":
    main()
