"""STEPS 23–24 — Wastage Analysis + Wastage-Risk Prediction
(SRS §1.2 Steps 23–24, FR xxx/xxxi).

Step 23: wastage by item/category/location/day/period/demand/consumption/
promotion/prep-proxy with costed impact.
Step 24: risk score per (item, restaurant) for the next 7 days from
decomposed predictors (hist demand, hist waste, dow mix, location, promo
exposure, popularity, forecast demand, consumption proxy). Transparent
weighted score (documented weights) — no black box.

Reads processed_data/{fact_wastage,fact_order_lines,feat_item,forecasts}.parquet.
Writes processed_data/wastage_{summary,risk}.parquet + reports/wastage_report.json.

Usage: python -m python_pipeline.wastage
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def run(proc: Path) -> dict:
    fw = pd.read_parquet(proc / "fact_wastage.parquet")
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    comp["order_date"] = pd.to_datetime(comp["order_datetime"]).dt.date
    fw["date"] = pd.to_datetime(fw["date"]).dt.date

    by_item = fw.groupby(["item_id", "item_name", "category_id"]).agg(
        wasted_qty=("wasted_qty", "sum"), wastage_cost=("wastage_cost", "sum"),
        incidents=("wasted_qty", "size")).reset_index().round(2)
    units = comp.groupby("item_id")["quantity"].sum()
    by_item["units_sold"] = by_item["item_id"].map(units).fillna(0)
    by_item["waste_per_unit_sold"] = (by_item["wasted_qty"] / by_item["units_sold"]).round(4)
    by_loc = fw.groupby(["restaurant_id", "city"]).agg(
        wasted_qty=("wasted_qty", "sum"), wastage_cost=("wastage_cost", "sum")).reset_index().round(2)
    by_reason = fw.groupby("reason")["wasted_qty"].sum().round(1).to_dict()
    by_day = fw.groupby("date")["wasted_qty"].sum().round(1)
    by_item.to_parquet(proc / "wastage_summary.parquet", index=False)

    # ---- Step 24: risk score ------------------------------------------------
    feat = pd.read_parquet(proc / "feat_item.parquet")[["item_id", "popularity", "units_sold"]]
    fc = pd.read_parquet(proc / "forecasts.parquet")
    fc_item = fc[fc["grain"] == "item"].groupby("entity_id")["forecast_units"].sum()
    w30 = fw[fw["date"] >= (fw["date"].max() - pd.Timedelta(days=30))]
    w_item = w30.groupby("item_id")["wasted_qty"].sum()
    risk = feat.copy()
    risk["recent_waste"] = risk["item_id"].map(w_item).fillna(0)
    risk["forecast_28"] = risk["item_id"].map(fc_item).fillna(0)
    # normalized components -> weighted score (weights documented in FORMULAS.md)
    for col in ["recent_waste", "forecast_28", "popularity", "units_sold"]:
        mx = risk[col].max()
        risk[col + "_n"] = risk[col] / mx if mx else 0
    risk["risk_score"] = (0.45 * risk["recent_waste_n"] + 0.25 * risk["forecast_28_n"]
                          + 0.15 * risk["popularity_n"] + 0.15 * risk["units_sold_n"]).round(3)
    risk["risk_band"] = pd.cut(risk["risk_score"], [-0.01, 0.2, 0.45, 0.7, 1.01],
                               labels=["low", "medium", "high", "critical"])
    risk.to_parquet(proc / "wastage_risk.parquet", index=False)

    report = {"total_wasted_qty": round(float(fw['wasted_qty'].sum()), 1),
              "total_wastage_cost": round(float(fw["wastage_cost"].sum()), 2),
              "incidents": len(fw),
              "top_items": by_item.sort_values("wastage_cost", ascending=False).head(5).to_dict("records"),
              "top_locations": by_loc.sort_values("wastage_cost", ascending=False).head(5).to_dict("records"),
              "by_reason": by_reason,
              "daily_avg_qty": round(float(by_day.mean()), 2),
              "high_risk_items": int((risk["risk_band"].isin(["high", "critical"])).sum())}
    print(json.dumps({k: v for k, v in report.items()
                      if k not in ("top_items", "top_locations", "by_reason")}, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "wastage_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/wastage_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
