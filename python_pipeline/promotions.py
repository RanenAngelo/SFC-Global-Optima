"""STEPS 27–28 — Promotion Effectiveness + Promotion-Trap Detection
(SRS §1.2 Steps 27–28, FR xxxiii/xxxiv).

Per promotion: order volume, revenue, contribution margin, new-customer
acquisition (first-ever order during window), repeat purchases, AOV, wastage
during window, post-promo behavior (revenue 14d after vs 14d before, same
targeted scope). Baseline = same scope, equal-length pre-window.
Sales increase alone NEVER marks success (SRS Step 27).

Trap patterns (Step 28): sales↑ profit↓ | buyers↑ margin collapse |
wastage surge | discount-only buyers (no repeat within 30d) |
cannibalization (targeted scope up, sibling scope down).

Reads processed_data/{fact_order_lines,clean/promotions,clean/customers,...}.parquet.
Writes processed_data/promo_{effectiveness,traps}.parquet + reports/promotions_report.json.

Usage: python -m python_pipeline.promotions
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def _scope_mask(comp: pd.DataFrame, scope: str, target: str) -> pd.Series:
    if scope == "Storewide":
        return pd.Series(True, index=comp.index)
    if scope == "Item":
        return comp["item_id"] == target
    if scope == "Category":
        return comp["category_id"] == target
    return pd.Series(False, index=comp.index)


def run(proc: Path) -> dict:
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"].copy()
    comp["d"] = pd.to_datetime(comp["order_datetime"]).dt.normalize()
    promos = pd.read_parquet(proc / "clean" / "promotions.parquet")
    fw = pd.read_parquet(proc / "fact_wastage.parquet")
    fw["d"] = pd.to_datetime(fw["date"]).dt.normalize()
    first_order = comp.groupby("customer_id")["d"].min()

    eff_rows, trap_rows = [], []
    for _, p in promos.iterrows():
        pid = p["promotion_id"]
        start, end = pd.to_datetime(p["start_date"]), pd.to_datetime(p["end_date"])
        days = max((end - start).days, 1)
        pre0, pre1 = start - pd.Timedelta(days=days), start - pd.Timedelta(days=1)
        post1 = end + pd.Timedelta(days=14)
        scope = _scope_mask(comp, p["scope"], p["target_id"])
        win = comp[scope & (comp["d"] >= start) & (comp["d"] <= end)]
        base = comp[scope & (comp["d"] >= pre0) & (comp["d"] <= pre1)]
        post = comp[scope & (comp["d"] > end) & (comp["d"] <= post1)]
        pre14 = comp[scope & (comp["d"] > end - pd.Timedelta(days=14)) & (comp["d"] <= end)]

        def agg(df):
            return {"orders": int(df["order_id"].nunique()), "revenue": round(float(df["line_total"].sum()), 2),
                    "margin": round(float(df["line_margin"].sum()), 2),
                    "buyers": int(df["customer_id"].nunique())}
        w, b = agg(win), agg(base)
        w_waste = float(fw[(fw["d"] >= start) & (fw["d"] <= end)]["wastage_cost"].sum())
        b_waste = float(fw[(fw["d"] >= pre0) & (fw["d"] <= pre1)]["wastage_cost"].sum())
        new_buyers = int(sum((c in first_order.index) and (first_order[c] >= start)
                             and (first_order[c] <= end) for c in win["customer_id"].unique()))
        # repeat within 30d after first promo-window purchase
        promo_buyers = set(win["customer_id"].unique())
        later = comp[(comp["d"] > end) & (comp["d"] <= end + pd.Timedelta(days=30))]
        repeaters = len(promo_buyers & set(later["customer_id"].unique()))
        aov_w = round(w["revenue"] / w["orders"], 2) if w["orders"] else 0.0
        post_rev = round(float(post["line_total"].sum()), 2)
        pre_rev = round(float(pre14["line_total"].sum()), 2)

        rev_lift = (w["revenue"] - b["revenue"]) / b["revenue"] if b["revenue"] else 0.0
        mar_lift = (w["margin"] - b["margin"]) / abs(b["margin"]) if b["margin"] else 0.0
        successful = (w["margin"] > b["margin"]) and (w["revenue"] >= b["revenue"]) and (repeaters > 0)
        eff_rows.append({"promotion_id": pid, "promotion_name": p["promotion_name"],
                         "scope": p["scope"], "target_id": p["target_id"],
                         "discount_pct": p["discount_pct"], **{f"win_{k}": v for k, v in w.items()},
                         **{f"base_{k}": v for k, v in b.items()},
                         "win_aov": aov_w, "win_wastage_cost": round(w_waste, 2),
                         "base_wastage_cost": round(b_waste, 2),
                         "new_buyers": new_buyers, "repeaters_30d": repeaters,
                         "post14_revenue": post_rev, "pre14_revenue": pre_rev,
                         "revenue_lift": round(rev_lift, 3), "margin_lift": round(mar_lift, 3),
                         "successful": bool(successful)})

        traps = []
        if w["revenue"] > b["revenue"] and w["margin"] < b["margin"]:
            traps.append("sales_up_profit_down")
        # SRS "such as" is non-exhaustive: margin bleeding while sales merely
        # hold still is the same trap family (deep discount destroying margin).
        if (mar_lift - rev_lift) < -0.10 and float(p["discount_pct"]) >= 0.2 \
                and b["revenue"] > 500:
            traps.append("margin_erosion")
        if w["buyers"] > b["buyers"] and w["orders"] and (w["margin"] / w["orders"]) < 0.5 * (
                (b["margin"] / b["orders"]) if b["orders"] else 1):
            traps.append("buyers_up_margin_collapse")
        if b_waste and w_waste > 1.5 * b_waste:
            traps.append("wastage_surge")
        if promo_buyers and repeaters / max(len(promo_buyers), 1) < 0.1 and len(promo_buyers) >= 5:
            traps.append("discount_only_buyers")
        if p["scope"] in ("Item", "Category"):
            sib_scope = ~scope
            sib_win = float(comp[sib_scope & (comp["d"] >= start)
                                 & (comp["d"] <= end)]["line_total"].sum())
            sib_base = float(comp[sib_scope & (comp["d"] >= pre0)
                                  & (comp["d"] <= pre1)]["line_total"].sum())
            if w["revenue"] > b["revenue"] and sib_win < 0.8 * sib_base:
                traps.append("cannibalization")
        for t in traps:
            trap_rows.append({"promotion_id": pid, "promotion_name": p["promotion_name"],
                              "trap": t})
    eff = pd.DataFrame(eff_rows)
    traps = pd.DataFrame(trap_rows) if trap_rows else pd.DataFrame(
        columns=["promotion_id", "promotion_name", "trap"])
    eff.to_parquet(proc / "promo_effectiveness.parquet", index=False)
    traps.to_parquet(proc / "promo_traps.parquet", index=False)
    report = {"promotions": len(eff), "successful": int(eff["successful"].sum()),
              "traps_found": len(traps),
              "trap_types": traps["trap"].value_counts().to_dict() if len(traps) else {}}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "promotions_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/promotions_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
