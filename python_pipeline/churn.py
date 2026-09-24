"""STEP 36 — Customer Churn-Risk Identification (SRS §1.2 Step 36, FR xli).

Risk signals (SRS): high recency, declining frequency/monetary (2nd-half vs
1st-half of tenure), shrinking category diversity, low visit rate.
Score = weighted sum (documented weights); bands low/medium/high/critical.

Reads processed_data/{fact_order_lines,customer_segments}.parquet.
Writes processed_data/churn_risk.parquet + reports/churn_report.json.

Usage: python -m python_pipeline.churn
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config.thresholds as T  # noqa: E402
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def run(proc: Path) -> dict:
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    comp["d"] = pd.to_datetime(comp["order_datetime"])
    seg = pd.read_parquet(proc / "customer_segments.parquet")
    max_d = comp["d"].max()

    rows = []
    for cust, grp in comp.groupby("customer_id"):
        grp = grp.sort_values("d")
        span = max((grp["d"].max() - grp["d"].min()).days, 1)
        mid = grp["d"].min() + (grp["d"].max() - grp["d"].min()) / 2
        first, second = grp[grp["d"] <= mid], grp[grp["d"] > mid]
        f1, f2 = first["order_id"].nunique(), second["order_id"].nunique()
        m1, m2 = first["line_total"].sum(), second["line_total"].sum()
        rec = (max_d - grp["d"].max()).days
        rows.append({
            "customer_id": cust,
            "recency_days": rec,
            "recency_flag": int(rec >= T.CHURN_RECENCY_DAYS),
            "freq_decline": round((f1 - f2) / f1, 3) if f1 else 0.0,
            "mon_decline": round((m1 - m2) / m1, 3) if m1 else 0.0,
            "category_diversity": int(grp["category_id"].nunique()),
            "visits_per_30d": round(grp["order_id"].nunique() / span * 30, 2),
            "frequency": int(grp["order_id"].nunique()),
        })
    ch = pd.DataFrame(rows)
    ch["score"] = (0.35 * ch["recency_flag"]
                   + 0.25 * (ch["freq_decline"] > 0.3).astype(int)
                   + 0.20 * (ch["mon_decline"] > 0.3).astype(int)
                   + 0.10 * (ch["category_diversity"] <= 1).astype(int)
                   + 0.10 * (ch["visits_per_30d"] < 1).astype(int)).round(2)
    ch["band"] = pd.cut(ch["score"], [-0.01, 0.2, 0.45, 0.7, 1.01],
                        labels=["low", "medium", "high", "critical"])
    ch = ch.merge(seg[["customer_id", "segment", "monetary"]], on="customer_id", how="left")
    ch.to_parquet(proc / "churn_risk.parquet", index=False)
    report = {"customers": len(ch), "bands": ch["band"].value_counts().to_dict(),
              "high_value_at_risk": int(((ch["band"].isin(["high", "critical"]))
                                         & (ch["segment"] == "High-Value Loyal Customers")).sum())}
    print(json.dumps(report, indent=2, default=str))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "churn_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/churn_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
