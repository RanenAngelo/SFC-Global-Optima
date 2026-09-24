"""STEP 31 — Sales Anomaly Detection (SRS §1.2 Step 31, FR xxxvii).

Detects: daily sales spikes/drops (per restaurant), abnormally high order
values, unusual discounts, unexpected demand (actual vs forecast), duplicate
transactions (post-cleaning residual check). Every anomaly carries metric,
baseline, actual, deviation, severity, timestamp, entity, explanation.

Reads processed_data/{fact_order_lines,forecasts,rating_anomalies}.parquet.
Writes processed_data/anomalies.parquet + reports/anomalies_report.json.

Usage: python -m python_pipeline.anomalies
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config.thresholds as T  # noqa: E402
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def sev(z):
    z = abs(z)
    return "critical" if z >= 4 else ("high" if z >= 3 else "medium")


def run(proc: Path) -> dict:
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    comp["d"] = pd.to_datetime(comp["order_datetime"]).dt.normalize()
    out = []

    # 1) daily sales spikes/drops per restaurant --------------------------------
    daily = comp.groupby(["restaurant_id", "d"])["line_total"].sum().reset_index()
    for rest, grp in daily.groupby("restaurant_id"):
        if len(grp) < 14:
            continue
        mu, sd = grp["line_total"].mean(), grp["line_total"].std() or 1e-9
        for _, r in grp.iterrows():
            z = (r["line_total"] - mu) / sd
            if abs(z) >= T.ANOMALY_ZSCORE:
                out.append({"category": "sales_spike" if z > 0 else "sales_drop",
                            "metric": "daily_revenue", "entity": f"restaurant:{rest}",
                            "timestamp": str(r["d"].date()), "actual": round(r["line_total"], 2),
                            "baseline": round(mu, 2), "deviation_z": round(z, 2),
                            "severity": sev(z),
                            "explanation": f"Daily revenue {r['line_total']:.0f} vs "
                                           f"mean {mu:.0f} (z={z:.1f})."})

    # 2) abnormally high order values ----------------------------------------------
    ot = comp.groupby(["order_id", "restaurant_id"])["line_total"].sum().reset_index()
    q1, q3 = ot["line_total"].quantile([0.25, 0.75])
    hi = q3 + T.ANOMALY_IQR_K * (q3 - q1)
    for _, r in ot[ot["line_total"] > hi].iterrows():
        out.append({"category": "high_order_value", "metric": "order_total",
                    "entity": f"order:{r['order_id']}", "timestamp": "",
                    "actual": round(r["line_total"], 2), "baseline": round(hi, 2),
                    "deviation_z": None, "severity": "medium",
                    "explanation": f"Order total {r['line_total']:.0f} exceeds "
                                   f"IQR upper fence {hi:.0f}."})

    # 3) unusual discounts --------------------------------------------------------------
    od = comp.groupby("order_id")["discount_pct"].max()
    for oid, dmax in od[od > 0.45].items():
        out.append({"category": "unusual_discount", "metric": "discount_pct",
                    "entity": f"order:{oid}", "timestamp": "",
                    "actual": round(float(dmax), 2), "baseline": 0.45,
                    "deviation_z": None, "severity": "medium",
                    "explanation": f"Discount {dmax:.0%} exceeds deepest genuine "
                                   "promotion (45%)."})

    # 4) unexpected demand: actual vs forecast (restaurant grain, last 28d) -----------------
    fc = pd.read_parquet(proc / "forecasts.parquet")
    fcr = fc[fc["grain"] == "restaurant"].copy()
    act = comp.groupby(["restaurant_id", "d"])["quantity"].sum().reset_index()
    act["d"] = pd.to_datetime(act["d"]).dt.strftime("%Y-%m-%d")
    m = fcr.merge(act, left_on=["entity_id", "date"], right_on=["restaurant_id", "d"],
                  how="inner")
    for _, r in m.iterrows():
        err = abs(r["quantity"] - r["forecast_units"])
        denom = max(r["quantity"], 1)
        if err / denom > 1.0 and r["quantity"] >= 10:
            out.append({"category": "unexpected_demand", "metric": "daily_units",
                        "entity": f"restaurant:{r['entity_id']}", "timestamp": r["date"],
                        "actual": int(r["quantity"]),
                        "baseline": round(float(r["forecast_units"]), 1),
                        "deviation_z": None, "severity": "high" if err / denom > 2 else "medium",
                        "explanation": f"Actual {r['quantity']} units vs forecast "
                                       f"{r['forecast_units']:.0f}."})

    # 5) duplicate transactions residual check ----------------------------------------------
    # NOTE: fact rows are per LINE, so order_id repeats legitimately. Check the
    # cleaned orders table for true duplicate transactions.
    clean_orders = pd.read_parquet(proc / "clean" / "orders.parquet")
    dup_orders = int(clean_orders.duplicated("order_id", keep=False).sum())
    dup_lines = int(comp.duplicated("order_item_id", keep=False).sum())

    # 6) fold in rating anomalies ---------------------------------------------------------------
    try:
        ra = pd.read_parquet(proc / "rating_anomalies.parquet")
        for _, r in ra.iterrows():
            out.append({"category": r["kind"], "metric": "rating",
                        "entity": f"item:{r['item_id']}", "timestamp": r["date"],
                        "actual": r["avg_rating"], "baseline": None,
                        "deviation_z": r["z"], "severity": "high",
                        "explanation": f"{r['kind']} on {r['item_id']} "
                                       f"(n={r['n']}, z={r['z']})."})
    except FileNotFoundError:
        pass

    anoms = pd.DataFrame(out) if out else pd.DataFrame(
        columns=["category", "metric", "entity", "timestamp", "actual", "baseline",
                 "deviation_z", "severity", "explanation"])
    anoms.to_parquet(proc / "anomalies.parquet", index=False)
    report = {"anomalies": len(anoms),
              "by_category": anoms["category"].value_counts().to_dict() if len(anoms) else {},
              "by_severity": anoms["severity"].value_counts().to_dict() if len(anoms) else {},
              "residual_duplicate_order_rows": dup_orders,
              "residual_duplicate_line_rows": dup_lines}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "anomalies_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/anomalies_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
