"""STEPS 40–41 — What-If Scenario + Impact Analysis (SRS §1.2, FR li).

Pure, importable simulation functions (used by the API AND the CLI).
Every output carries `estimate: True`, numeric deltas, and an explicit
assumptions list (SRS Step 41: simulated outputs labelled estimates).

Scenarios: price change, discount change, remove item, reduce prep quantity,
demand shift, wastage-assumption change, promo-frequency change.

Usage: python -m python_pipeline.whatif --demo   (runs sample scenarios)
"""
import argparse
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402

_cache = {}


def _load(proc: Path):
    if "mc" not in _cache:
        _cache["mc"] = pd.read_parquet(proc / "menu_classified.parquet")
        _cache["fol"] = pd.read_parquet(proc / "fact_order_lines.parquet")
        _cache["elas"] = pd.read_parquet(proc / "price_elasticity.parquet")
        _cache["wr"] = pd.read_parquet(proc / "wastage_summary.parquet")
    return _cache["mc"], _cache["fol"], _cache["elas"], _cache["wr"]


def _item_elasticity(elas: pd.DataFrame, item_id: str):
    # Downward-sloping demand is enforced as a guardrail: a measured e >= 0
    # contradicts demand theory and signals confounding (growth/promo overlap),
    # so it is NEVER used raw — we fall back to unit-elastic and say so.
    ev = elas[(elas["item_id"] == item_id) & (elas["verdict"] != "insufficient_evidence")]
    if len(ev):
        e = float(ev.iloc[0]["elasticity"])
        if e < -0.05:
            return e, "item elasticity (measured)"
        return -1.0, (f"measured e={e} unreliable (non-negative, likely confounded); "
                       "unit-elastic fallback (assumption)")
    return -1.0, "no measured elasticity for item; unit-elastic fallback (assumption)"


def scenario_price(item_id: str, new_price: float, proc: Path = PROCESSED_DIR) -> dict:
    mc, fol, elas, _ = _load(proc)
    row = mc[mc["item_id"] == item_id].iloc[0]
    comp = fol[(fol["status"] == "Completed") & (fol["item_id"] == item_id)]
    p1 = float(comp["unit_price"].median()) if len(comp) else float(row["revenue"] / max(row["units_sold"], 1))
    q1 = float(row["units_sold"])
    e, e_src = _item_elasticity(elas, item_id)
    dp = (new_price - p1) / p1 if p1 else 0
    q2 = max(q1 * (1 + e * dp), 0)
    unit_cost = float(row["cost"] / max(row["units_sold"], 1))
    rev1, rev2 = q1 * p1, q2 * new_price
    mar1, mar2 = q1 * (p1 - unit_cost), q2 * (new_price - unit_cost)
    return {"scenario": "price_change", "item_id": item_id, "estimate": True,
            "inputs": {"old_price": round(p1, 2), "new_price": round(new_price, 2)},
            "impact": {"demand_pct": round(100 * (q2 - q1) / q1, 1) if q1 else 0,
                       "revenue_delta": round(rev2 - rev1, 2),
                       "margin_delta": round(mar2 - mar1, 2)},
            "assumptions": [f"elasticity e={e} ({e_src})", "unit cost constant",
                            "no competitor response", "window = full history scale"]}  # noqa: E501


def scenario_discount(item_id: str, discount_pct: float, days: int = 14,
                      proc: Path = PROCESSED_DIR) -> dict:
    mc, fol, _, _ = _load(proc)
    row = mc[mc["item_id"] == item_id].iloc[0]
    comp = fol[(fol["status"] == "Completed") & (fol["item_id"] == item_id)].copy()
    comp["d"] = pd.to_datetime(comp["order_datetime"]).dt.normalize()
    on = comp[comp["discount_pct"] > 0].groupby("d")["quantity"].sum().mean()
    off = comp[comp["discount_pct"] == 0].groupby("d")["quantity"].sum().mean()
    lift = float(on / off) if on and off else 1.2
    lift_src = "observed item promo lift" if on and off else "default 1.2x (assumption)"
    p = float(comp["unit_price"].median()) if len(comp) else 0
    unit_cost = float(row["cost"] / max(row["units_sold"], 1))
    q_day = float(comp.groupby("d")["quantity"].sum().mean() or 0)
    rev1, mar1 = q_day * days * p, q_day * days * (p - unit_cost)
    rev2 = q_day * lift * days * p * (1 - discount_pct)
    mar2 = q_day * lift * days * (p * (1 - discount_pct) - unit_cost)
    return {"scenario": "discount_change", "item_id": item_id, "estimate": True,
            "inputs": {"discount_pct": discount_pct, "days": days},
            "impact": {"revenue_delta": round(rev2 - rev1, 2),
                       "margin_delta": round(mar2 - mar1, 2),
                       "volume_lift_x": round(lift, 2)},
            "assumptions": [lift_src, "lift constant over window", "no cannibalization"]}  # noqa: E501


def scenario_remove(item_id: str, proc: Path = PROCESSED_DIR) -> dict:
    mc, _, _, wr = _load(proc)
    row = mc[mc["item_id"] == item_id].iloc[0]
    w = wr[wr["item_id"] == item_id]
    waste_save = float(w.iloc[0]["wastage_cost"]) if len(w) else 0.0
    return {"scenario": "remove_item", "item_id": item_id, "estimate": True,
            "inputs": {},
            "impact": {"revenue_delta": round(-float(row["revenue"]), 2),
                       "margin_delta": round(-float(row["contribution_margin"]), 2),
                       "wastage_cost_saved": round(waste_save, 2)},
            "assumptions": ["no substitution to other items", "full waste saving"]}  # noqa: E501


def scenario_prep_cut(item_id: str, cut_pct: float, proc: Path = PROCESSED_DIR) -> dict:
    mc, _, _, wr = _load(proc)
    row = mc[mc["item_id"] == item_id].iloc[0]
    w = wr[wr["item_id"] == item_id]
    waste = float(w.iloc[0]["wasted_qty"]) if len(w) else 0.0
    saved_qty = waste * cut_pct * 0.8
    unit_cost = float(row["cost"] / max(row["units_sold"], 1))
    return {"scenario": "reduce_prep", "item_id": item_id, "estimate": True,
            "inputs": {"cut_pct": cut_pct},
            "impact": {"wastage_qty_saved": round(saved_qty, 1),
                       "wastage_cost_saved": round(saved_qty * unit_cost, 2),
                       "stockout_risk": "low" if cut_pct <= 0.2 else "review forecast first"},
            "assumptions": ["80% of cut converts to waste saved", "demand unchanged"]}  # noqa: E501


def scenario_demand(item_id: str, demand_pct: float, proc: Path = PROCESSED_DIR) -> dict:
    mc, _, _, wr = _load(proc)
    row = mc[mc["item_id"] == item_id].iloc[0]
    w = wr[wr["item_id"] == item_id]
    waste = float(w.iloc[0]["wasted_qty"]) if len(w) else 0.0
    return {"scenario": "demand_shift", "item_id": item_id, "estimate": True,
            "inputs": {"demand_pct": demand_pct},
            "impact": {"revenue_delta": round(float(row["revenue"]) * demand_pct, 2),
                       "margin_delta": round(float(row["contribution_margin"]) * demand_pct, 2),
                       "wastage_qty_delta": round(waste * demand_pct, 1)},
            "assumptions": ["linear scale of revenue/margin/waste", "price constant"]}  # noqa: E501


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()
    mc = pd.read_parquet(PROCESSED_DIR / "menu_classified.parquet")
    item = mc.sort_values("revenue", ascending=False).iloc[0]["item_id"]
    comp_price = pd.read_parquet(PROCESSED_DIR / "fact_order_lines.parquet")
    comp_price = comp_price[(comp_price["status"] == "Completed")
                            & (comp_price["item_id"] == item)]
    p = float(comp_price["unit_price"].median())
    demo = {"sample_item": item,
            "price_up_10pct": scenario_price(item, round(p * 1.1, 2)),
            "discount_15pct_14d": scenario_discount(item, 0.15, 14),
            "remove": scenario_remove(item),
            "prep_cut_20pct": scenario_prep_cut(item, 0.2),
            "demand_up_10pct": scenario_demand(item, 0.10)}
    if args.demo:
        print(json.dumps(demo, indent=2, default=str))
    (REPORTS_DIR / "whatif_demo.json").write_text(json.dumps(demo, indent=2, default=str))
    print("Report -> reports/whatif_demo.json")
    return demo


if __name__ == "__main__":
    main()
