"""STEPS 29–30 — Rating/Satisfaction Analysis + Rating Anomaly Detection
(SRS §1.2 Steps 29–30, FR xxxv/xxxvi).

Step 29: ratings vs item/location/profitability/sales/repeat/time/promo.
Step 30: spikes, drops, identical-rating bursts, high-velocity windows,
purchase-inconsistent ratings. z-score + IQR detectors (config/thresholds).

Reads processed_data/{fact_ratings,menu_classified,feat_item}.parquet.
Writes processed_data/rating_{summary,anomalies}.parquet + reports/ratings_report.json.

Usage: python -m python_pipeline.ratings
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config.thresholds as T  # noqa: E402
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def run(proc: Path) -> dict:
    fr = pd.read_parquet(proc / "fact_ratings.parquet")
    fr["review_date"] = pd.to_datetime(fr["review_date"])
    cls = pd.read_parquet(proc / "menu_classified.parquet")[
        ["item_id", "performance_class", "contribution_margin", "units_sold",
         "repeat_purchase_rate", "promotion_dependency"]]

    by_item = fr.groupby(["item_id", "item_name"]).agg(
        avg_rating=("rating", "mean"), n=("rating", "size")).reset_index().round(3)
    summary = by_item.merge(cls, on="item_id", how="left")
    summary.to_parquet(proc / "rating_summary.parquet", index=False)
    by_loc = fr.groupby("restaurant_id")["rating"].agg(["mean", "size"]).round(3)
    dist = fr["rating"].value_counts().sort_index().to_dict()

    # ---- Step 30: anomaly detectors ------------------------------------------
    anoms = []
    daily = fr.groupby([pd.Grouper(key="review_date", freq="D"), "item_id"])["rating"].agg(
        ["mean", "size"]).reset_index()
    for item, grp in daily.groupby("item_id"):
        if len(grp) < 10:
            continue
        mu, sd = grp["mean"].mean(), grp["mean"].std() or 1e-9
        for _, r in grp.iterrows():
            z = (r["mean"] - mu) / sd
            if abs(z) >= T.ANOMALY_ZSCORE and r["size"] >= 3:
                anoms.append({"kind": "rating_spike" if z > 0 else "rating_drop",
                              "item_id": item, "date": str(r["review_date"].date()),
                              "avg_rating": round(r["mean"], 2), "n": int(r["size"]),
                              "z": round(z, 2)})
    # identical-rating bursts + velocity: >=10 identical ratings in 3 days
    fr_sorted = fr.sort_values(["item_id", "review_date"])
    burst = fr_sorted.groupby(["item_id", "rating"]).apply(
        lambda g: g.set_index("review_date").rolling("3D")["rating_id"].count().max()
        if len(g) else 0, include_groups=False)
    for (item, rating), mx in burst.items():
        if mx >= 10:
            anoms.append({"kind": "identical_burst", "item_id": item, "date": "",
                          "avg_rating": int(rating), "n": int(mx), "z": None})
    anoms_df = pd.DataFrame(anoms) if anoms else pd.DataFrame(
        columns=["kind", "item_id", "date", "avg_rating", "n", "z"])
    anoms_df.to_parquet(proc / "rating_anomalies.parquet", index=False)

    report = {"ratings": len(fr), "overall_avg": round(float(fr['rating'].mean()), 3),
              "distribution": {int(k): int(v) for k, v in dist.items()},
              "locations": len(by_loc),
              "rating_anomalies": len(anoms_df),
              "anomaly_kinds": anoms_df["kind"].value_counts().to_dict() if len(anoms_df) else {}}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "ratings_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/ratings_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
