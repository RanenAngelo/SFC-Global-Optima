"""STEPS 25–26 — Price Intelligence + Price-Sensitivity Analysis
(SRS §1.2 Steps 25–26, FR xxxii).

For each price-change event (pricing_history), compares average daily units in
the 21 days BEFORE vs AFTER the change (same item, all restaurants; promo-day
overlap is measured and reported as a confounder). Arc elasticity:

  e = ((Q2-Q1)/((Q1+Q2)/2)) / ((P2-P1)/((P1+P2)/2))

Classification (SRS Step 26): |e|>1 Highly, 0.5–1 Moderately, <0.5 Low.
Events with <7 active days on either side or zero price delta are reported as
"insufficient_evidence" — never faked.

Reads processed_data/{fact_order_lines,dim_menu_price}.parquet + clean/pricing_history.
Writes processed_data/price_elasticity.parquet + reports/pricing_report.json.

Usage: python -m python_pipeline.pricing
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
    comp["d"] = pd.to_datetime(comp["order_datetime"]).dt.normalize()
    daily = comp.groupby(["item_id", "d"])["quantity"].sum().reset_index()
    promo_days = set(comp[comp["discount_pct"] > 0]["d"].unique())
    ph = pd.read_parquet(proc / "clean" / "pricing_history.parquet")
    ph["effective_from"] = pd.to_datetime(ph["effective_from"])

    rows = []
    for item, grp in ph.groupby("item_id"):
        grp = grp.sort_values("effective_from").reset_index(drop=True)
        item_daily = daily[daily["item_id"] == item].set_index("d")["quantity"]
        for i in range(1, len(grp)):
            p1, p2 = float(grp.loc[i - 1, "price"]), float(grp.loc[i, "price"])
            cut = grp.loc[i, "effective_from"]
            if p1 <= 0 or p2 == p1 or pd.isna(cut):
                continue
            before = item_daily[(item_daily.index >= cut - pd.Timedelta(days=21))
                                & (item_daily.index < cut)]
            after = item_daily[(item_daily.index >= cut)
                               & (item_daily.index < cut + pd.Timedelta(days=21))]
            b_days, a_days = (before > 0).sum(), (after > 0).sum()
            if b_days < 7 or a_days < 7:
                rows.append({"item_id": item, "verdict": "insufficient_evidence",
                             "reason": f"active days before={b_days} after={a_days} (<7)",
                             "p1": p1, "p2": p2})
                continue
            q1, q2 = float(before.mean()), float(after.mean())
            # Significance guard: Welch's t-test on daily quantities; noisy
            # sparse windows must not mint fake "Highly Sensitive" verdicts.
            from scipy import stats as _stats
            try:
                _t, p_value = _stats.ttest_ind(before.values, after.values, equal_var=False)
                p_value = float(p_value)
            except Exception:
                p_value = 1.0
            if not (p_value < 0.10) or abs((p2 - p1) / p1) < 0.03:
                rows.append({"item_id": item, "verdict": "insufficient_evidence",
                             "reason": f"not significant (p={p_value:.2f}) or |dP|<3%",
                             "p1": p1, "p2": p2})
                continue
            dq = (q2 - q1) / ((q1 + q2) / 2) if (q1 + q2) else 0.0
            dp = (p2 - p1) / ((p1 + p2) / 2)
            e = dq / dp if dp else 0.0
            ae = abs(e)
            cls = ("Highly Price Sensitive" if ae > T.ELASTICITY_HIGH
                   else ("Moderately Price Sensitive" if ae > T.ELASTICITY_MODERATE
                         else "Low Price Sensitivity"))
            window = pd.date_range(cut - pd.Timedelta(days=21), cut + pd.Timedelta(days=21))
            promo_overlap = round(float(sum(d in promo_days for d in window)) / len(window), 3)
            rows.append({"item_id": item, "p1": p1, "p2": p2,
                         "price_change_pct": round(100 * (p2 - p1) / p1, 2),
                         "q1_day": round(q1, 2), "q2_day": round(q2, 2),
                         "elasticity": round(e, 3), "verdict": cls,
                         "promo_overlap_share": promo_overlap,
                         "reason": ("confounded by promos" if promo_overlap > 0.3 else "clean window")})
    elas = pd.DataFrame(rows)
    elas.to_parquet(proc / "price_elasticity.parquet", index=False)
    item_verdict = (elas[elas["verdict"] != "insufficient_evidence"].sort_values("elasticity")
                    .drop_duplicates("item_id").set_index("item_id")["verdict"]
                    if len(elas) else pd.Series(dtype=str))
    report = {"price_events": len(elas),
              "with_evidence": int((elas["verdict"] != "insufficient_evidence").sum()) if len(elas) else 0,
              "verdicts": elas["verdict"].value_counts().to_dict() if len(elas) else {},
              "items_classified": len(item_verdict)}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "pricing_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/pricing_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
