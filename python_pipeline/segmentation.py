"""STEPS 15–16 — Customer Segmentation + RFM Analysis (SRS §1.2, FR xxiii/xxiv).

RFM quintile scores (R inverted: 5 = most recent) then deterministic mapping to
the six SRS segments. Writes processed_data/customer_segments.parquet +
reports/segmentation_report.json (incl. honest agreement vs the generator's
hidden true_segment — validation only, never an input).

Usage: python -m python_pipeline.segmentation
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def rfm_scores(c: pd.DataFrame) -> pd.DataFrame:
    c = c.copy()
    c["R"] = pd.qcut(c["recency_days"].rank(method="first", ascending=False), 5,
                     labels=[1, 2, 3, 4, 5]).astype(int)
    c["F"] = pd.qcut(c["frequency"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    c["M"] = pd.qcut(c["monetary"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    c["RFM"] = c["R"].astype(str) + c["F"].astype(str) + c["M"].astype(str)
    return c


def assign_segment(r) -> str:
    if r["days_since_signup"] <= 45 and r["frequency"] <= 3:
        return "New Customers"
    if r["R"] <= 2 and r["F"] >= 3 and r["tenure_days"] > 60:
        return "At-Risk Customers"
    if r["R"] >= 4 and r["F"] >= 4 and r["M"] >= 4:
        return "High-Value Loyal Customers"
    if r["F"] >= 4 and r["R"] >= 3:
        return "Frequent Customers"
    if r["promo_sensitivity"] >= 0.5:
        return "Promotion-Driven Customers"
    return "Occasional Customers"


def run(proc: Path) -> dict:
    c = pd.read_parquet(proc / "feat_customer.parquet")
    cust_dates = pd.read_parquet(proc / "clean" / "customers.parquet")[
        ["customer_id", "signup_date"]]
    maxum = pd.to_datetime(cust_dates["signup_date"]).max()
    c = c.merge(cust_dates, on="customer_id", how="left")
    c["days_since_signup"] = (maxum - pd.to_datetime(c["signup_date"])).dt.days
    c["days_since_signup"] = c["days_since_signup"].fillna(9999)
    c = rfm_scores(c)
    c["segment"] = c.apply(assign_segment, axis=1)
    c.to_parquet(proc / "customer_segments.parquet", index=False)
    cust = pd.read_parquet(proc / "clean" / "customers.parquet")[["customer_id", "true_segment"]]
    j = c.merge(cust, on="customer_id")
    norm = {"High-Value Loyal Customers": "High-Value Loyal", "Frequent Customers": "Frequent",
            "Promotion-Driven Customers": "Promotion-Driven", "At-Risk Customers": "At-Risk",
            "New Customers": "New", "Occasional Customers": "Occasional"}
    agree = float((j["segment"].map(norm) == j["true_segment"]).mean())
    report = {"customers": len(c),
              "segments": c["segment"].value_counts().to_dict(),
              "hidden_tag_agreement_pct": round(agree * 100, 2),
              "note": "Agreement vs generator hidden tag is validation only; "
                      "segments derive purely from RFM + behavior."}
    print(json.dumps(report, indent=2))
    return {"segments": c, "report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "segmentation_report.json").write_text(json.dumps(res["report"], indent=2))
    print("Report -> reports/segmentation_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
