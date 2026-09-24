"""STEPS 10–11 — Menu Performance Classification + tricky cases
(SRS §1.2 Steps 10–11, FR xxi).

Data-driven 4-class assignment (Profit Driver / Volume Driver /
Hidden Opportunity / Low Performer). Cut-offs are percentiles computed from
the LIVE dataset (config/thresholds.py) — never a single hard-coded field —
plus absolute rating anchors on the 1–5 scale. Step-11 tricky scenarios are
detected as explicit flags on every item.

Reads processed_data/{menu_performance,feat_item}.parquet + clean/menu_items.
Writes processed_data/menu_classified.parquet + reports/classification_report.json.

Usage: python -m python_pipeline.classify_menu
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import config.thresholds as T  # noqa: E402
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def classify(df: pd.DataFrame, bands: dict) -> pd.Series:
    def row(r):
        hi_d = r["units_sold"] >= bands["d_hi"]
        hi_p = r["contribution_margin"] >= bands["p_hi"]
        ok_waste = not (pd.notna(r["wastage_pct"]) and r["wastage_pct"] >= bands["w_hi"])
        good_rate = pd.notna(r["avg_rating"]) and r["avg_rating"] >= T.MENU_GOOD_RATING
        poor_rate = pd.notna(r["avg_rating"]) and r["avg_rating"] < T.MENU_POOR_RATING
        good_rep = pd.notna(r["repeat_purchase_rate"]) and r["repeat_purchase_rate"] >= bands["r_good"]
        if hi_d and hi_p and ok_waste:
            return "Profit Driver"
        if hi_d:
            return "Volume Driver"
        if (hi_p or (good_rate and good_rep)) and ok_waste and not poor_rate:
            return "Hidden Opportunity"
        return "Low Performer"
    return df.apply(row, axis=1)


def tricky_flags(perf: pd.DataFrame, bands: dict, menu: pd.DataFrame) -> pd.DataFrame:
    intro = menu.set_index("item_id")["introduced_date"]
    max_intro = pd.to_datetime(intro).max()
    flags = pd.DataFrame(index=perf.index)
    flags["item_id"] = perf["item_id"]
    f = {}
    f["loss_maker"] = (perf["contribution_margin"] < 0) & (perf["units_sold"] >= bands["d_hi"])
    f["rare_gem"] = (perf["contribution_margin"] >= bands["p_hi"]) & (perf["units_sold"] <= bands["d_lo"])
    f["wasteful_popular"] = (perf["units_sold"] >= bands["d_hi"]) & (perf["wastage_pct"] >= bands["w_hi"])
    f["rated_but_unprofitable"] = (perf["avg_rating"] >= T.MENU_GOOD_RATING) & (
        perf["contribution_margin"] <= bands["p_lo"])
    f["lowrated_highsales"] = (perf["avg_rating"] < T.MENU_POOR_RATING) & (
        perf["units_sold"] >= bands["d_hi"])
    f["promo_dependent"] = perf["promotion_dependency"] >= perf["promotion_dependency"].quantile(0.8)
    f["location_variance"] = perf["location_cv"] > 1.0
    f["weekend_only"] = perf["weekend_share"] > 0.7
    # Conservative by design: DEMO data has no seasonal demand signal (the
    # generator's seasonal_tag never modulates orders — verified in source),
    # so only repeated detrended bursts (>= 2 spike months) qualify.
    f["seasonal"] = ((perf["spike_months"] >= 2) & (perf["months_active"] >= 10)).fillna(False)
    intro_dt = pd.to_datetime(perf["item_id"].map(intro))
    f["new_item"] = ((max_intro - intro_dt).dt.days <= T.MENU_NEW_ITEM_DAYS) | (perf["order_frequency"] < 10)
    for k, v in f.items():
        flags[k] = v.fillna(False).astype(bool)
    return flags


def run(proc: Path) -> dict:
    perf = pd.read_parquet(proc / "menu_performance.parquet")
    menu = pd.read_parquet(proc / "clean" / "menu_items.parquet")
    bands = {
        "d_hi": float(perf["units_sold"].quantile(T.MENU_HIGH_DEMAND_PCT / 100)),
        "d_lo": float(perf["units_sold"].quantile(T.MENU_LOW_DEMAND_PCT / 100)),
        "p_hi": float(perf["contribution_margin"].quantile(T.MENU_HIGH_PROFIT_PCT / 100)),
        "p_lo": float(perf["contribution_margin"].quantile(T.MENU_LOW_PROFIT_PCT / 100)),
        "w_hi": float(perf["wastage_pct"].quantile(T.MENU_HIGH_WASTAGE_PCT / 100)),
        "r_good": float(perf["repeat_purchase_rate"].quantile(T.MENU_GOOD_REPEAT_PCT / 100)),
    }
    perf["performance_class"] = classify(perf, bands)
    flags = tricky_flags(perf, bands, menu)
    out = perf.merge(flags, on="item_id")
    out.to_parquet(proc / "menu_classified.parquet", index=False)
    report = {"bands": bands,
              "class_counts": out["performance_class"].value_counts().to_dict(),
              "tricky_counts": {c: int(out[c].sum()) for c in flags.columns if c != "item_id"}}
    print(json.dumps(report, indent=2))
    return {"classified": out, "report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "classification_report.json").write_text(json.dumps(res["report"], indent=2))
    print("Report -> reports/classification_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
