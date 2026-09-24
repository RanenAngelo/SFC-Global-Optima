"""STEP 19 — Peak-Period Analysis (SRS §1.2 Step 19, FR xxii).

Peak hours/days, weekend patterns, monthly + seasonal trends,
location-specific peaks, dine-in vs delivery peaks.
Reads processed_data/fact_order_lines.parquet.
Writes processed_data/peaks.parquet + reports/peaks_report.json.

Usage: python -m python_pipeline.peaks
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
    comp["dt"] = pd.to_datetime(comp["order_datetime"])
    comp["month"] = comp["dt"].dt.strftime("%Y-%m")
    comp["dow_name"] = comp["dt"].dt.day_name()

    by_hour = comp.groupby("order_hour")["order_id"].nunique().sort_values(ascending=False)
    by_dow = comp.groupby("dow_name")["order_id"].nunique().reindex(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
    by_month = comp.groupby("month")["order_id"].nunique()
    weekend_share = float(comp["is_weekend"].mean())
    loc_peak = comp.groupby(["restaurant_id", "order_hour"])["order_id"].nunique().reset_index()
    loc_peak = loc_peak.sort_values("order_id", ascending=False).drop_duplicates("restaurant_id")
    chan_peak = comp.groupby(["channel", "order_hour"])["order_id"].nunique().reset_index()
    chan_peak = chan_peak.sort_values("order_id", ascending=False).drop_duplicates("channel")

    peaks = pd.DataFrame({"hour": by_hour.index, "orders": by_hour.values})
    peaks["is_peak"] = peaks["orders"] >= peaks["orders"].quantile(0.75)
    peaks.to_parquet(proc / "peaks.parquet", index=False)
    report = {
        "peak_hours": [int(h) for h in by_hour.head(3).index],
        "peak_hour_orders": {str(k): int(v) for k, v in by_hour.head(5).items()},
        "peak_day": str(by_dow.idxmax()),
        "orders_by_weekday": {k: int(v) for k, v in by_dow.items()},
        "weekend_order_share": round(weekend_share, 3),
        "peak_month": str(by_month.idxmax()),
        "orders_by_month": {k: int(v) for k, v in by_month.items()},
        "location_peaks": loc_peak.rename(columns={"order_hour": "peak_hour"}).to_dict("records"),
        "channel_peaks": chan_peak.rename(columns={"order_hour": "peak_hour"}).to_dict("records"),
    }
    print(json.dumps({k: v for k, v in report.items()
                      if k not in ("orders_by_month", "location_peaks", "channel_peaks")}, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "peaks_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/peaks_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
