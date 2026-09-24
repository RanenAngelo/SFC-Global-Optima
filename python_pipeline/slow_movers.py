"""STEP 32 — Slow-Moving Dish Detection (SRS §1.2 Step 32).

Composite of all 7 SRS signals: low volume, low frequency, long gaps, low
repeat, high wastage, weak profit, poor trend. An item is slow-moving when
>=4 of 7 flags fire (documented rule).

Reads processed_data/{menu_classified,fact_order_lines}.parquet.
Writes processed_data/slow_movers.parquet + reports/slow_movers_report.json.

Usage: python -m python_pipeline.slow_movers
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config.thresholds as T  # noqa: E402
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def run(proc: Path) -> dict:
    c = pd.read_parquet(proc / "menu_classified.parquet")
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    comp["d"] = pd.to_datetime(comp["order_datetime"]).dt.normalize()
    span_days = (comp["d"].max() - comp["d"].min()).days or 1
    freq = comp.groupby("item_id")["order_id"].nunique()
    gap = span_days / freq  # avg days between purchases

    s = c[["item_id", "item_name", "category_name", "units_sold", "order_frequency",
           "repeat_purchase_rate", "wastage_pct", "contribution_margin",
           "sales_trend", "performance_class"]].copy()
    s["low_volume"] = s["units_sold"] <= s["units_sold"].quantile(T.SLOW_SALES_PCT / 100)
    s["low_frequency"] = s["order_frequency"] <= s["order_frequency"].quantile(T.SLOW_SALES_PCT / 100)
    s["long_gap"] = s["item_id"].map(gap) >= gap.quantile(0.75)
    s["low_repeat"] = s["repeat_purchase_rate"] <= s["repeat_purchase_rate"].quantile(T.SLOW_REPEAT_PCT / 100)
    s["high_waste"] = s["wastage_pct"] >= s["wastage_pct"].quantile(0.75)
    s["weak_profit"] = s["contribution_margin"] <= s["contribution_margin"].quantile(0.25)
    s["poor_trend"] = s["sales_trend"] == "down"
    flag_cols = ["low_volume", "low_frequency", "long_gap", "low_repeat",
                 "high_waste", "weak_profit", "poor_trend"]
    s["signals"] = s[flag_cols].sum(axis=1)
    s["slow_moving"] = s["signals"] >= 4
    s.to_parquet(proc / "slow_movers.parquet", index=False)
    report = {"items": len(s), "slow_moving": int(s["slow_moving"].sum()),
              "slow_items": s[s["slow_moving"]][["item_id", "item_name", "signals",
                                                 "performance_class"]].to_dict("records")}
    print(json.dumps({k: v for k, v in report.items() if k != "slow_items"}, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "slow_movers_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/slow_movers_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
