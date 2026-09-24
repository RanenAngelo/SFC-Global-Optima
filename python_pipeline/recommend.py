"""STEPS 37–39 — Recommendation Engine + Evidence + Priority
(SRS §1.2 Steps 37–39, FR xlvii–l).

All 9 SRS recommendation types, every one carrying analytical evidence
(source module + metrics) and an impact-based priority (Low/Medium/High/
Critical). Nothing is generic: each row names its entity and numbers.

Reads processed_data/{menu_classified,slow_movers,wastage_summary,
price_elasticity,basket_bundles,forecasts,customer_segments,churn_risk,
promo_effectiveness,promo_traps,anomalies,location_intelligence}.parquet.
Writes processed_data/recommendations.parquet + reports/recommendations_report.json.

Usage: python -m python_pipeline.recommend
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def run(proc: Path) -> dict:
    mc = pd.read_parquet(proc / "menu_classified.parquet")
    slow = pd.read_parquet(proc / "slow_movers.parquet")
    wr = pd.read_parquet(proc / "wastage_summary.parquet")
    elas = pd.read_parquet(proc / "price_elasticity.parquet")
    bund = pd.read_parquet(proc / "basket_bundles.parquet")
    fc = pd.read_parquet(proc / "forecasts.parquet")
    ch = pd.read_parquet(proc / "churn_risk.parquet")
    eff = pd.read_parquet(proc / "promo_effectiveness.parquet")
    traps = pd.read_parquet(proc / "promo_traps.parquet")
    an = pd.read_parquet(proc / "anomalies.parquet")
    recs, rid = [], [0]

    def add(rtype, title, entity, action, evidence, source, priority, impact_rs):
        rid[0] += 1
        recs.append({"id": f"REC-{rid[0]:03d}", "type": rtype, "title": title,
                     "entity": entity, "action": action, "evidence": evidence,
                     "source": source, "priority": priority,
                     "impact_rs": round(float(impact_rs), 2)})

    # 1) promote Hidden Opportunities ------------------------------------------------
    hidden = mc[mc["performance_class"] == "Hidden Opportunity"].sort_values(
        "contribution_margin", ascending=False).head(5)
    for _, r in hidden.iterrows():
        add("menu_promotion", f"Promote {r['item_name']} ({r['item_id']})", r["item_id"],
            "Feature on menu top-section and app banners; trial 10% visibility push.",
            [f"contribution margin Rs.{r['contribution_margin']:.0f}",
             f"rating {r['avg_rating']}", f"repeat {r['repeat_purchase_rate']:.0%}",
             f"only {r['units_sold']:.0f} units sold (low visibility)"],
            "classify_menu", "High", r["contribution_margin"])

    # 2) cut prep of high-waste dishes -----------------------------------------------------
    for _, r in wr.sort_values("wastage_cost", ascending=False).head(5).iterrows():
        add("wastage_reduction", f"Cut preparation of {r['item_name']} ({r['item_id']})",
            r["item_id"], "Reduce batch prep 20% and shift to cook-to-order at off-peak.",
            [f"wastage cost Rs.{r['wastage_cost']:.0f}", f"{r['wasted_qty']:.0f} units wasted",
             f"{r['incidents']} incidents"], "wastage",
            "Critical" if r["wastage_cost"] > 10000 else "High", r["wastage_cost"])

    # 3) reprice price-sensitive dishes ---------------------------------------------------------
    sens = elas[elas["verdict"] == "Highly Price Sensitive"].drop_duplicates("item_id").head(5)
    for _, r in sens.iterrows():
        add("pricing", f"Review price of {r['item_id']}", r["item_id"],
            f"Test a small price move; elasticity {r['elasticity']}: demand reacts strongly.",
            [f"elasticity {r['elasticity']}", f"last change {r['price_change_pct']}%",
             r.get("reason", "")], "pricing", "Medium", 0)

    # 4) bundles -------------------------------------------------------------------------------
    for _, r in bund.head(5).iterrows():
        add("bundling", f"Bundle: {r['offer']}", r["antecedent"] + "+" + r["consequent"],
            f"Create a {r['kind']} combo for the pair.",
            [r["evidence"]], "basket", "Medium", 0)

    # 5) remove/redesign persistent Low Performers -----------------------------------------------------
    bad = mc[(mc["performance_class"] == "Low Performer")].merge(
        slow[slow["slow_moving"]][["item_id"]], on="item_id")
    bad = bad[bad["sales_trend"] == "down"].sort_values("contribution_margin").head(5)
    for _, r in bad.iterrows():
        add("menu_removal", f"Remove or redesign {r['item_name']} ({r['item_id']})",
            r["item_id"], "Delist after 2-week sell-through or re-engineer recipe/cost.",
            [f"class Low Performer", f"slow-moving ({int(r['order_frequency'])} orders)",
             f"trend down {r['sales_trend_pct']}%", f"margin Rs.{r['contribution_margin']:.0f}"],
            "classify_menu+slow_movers", "High", abs(min(r["contribution_margin"], 0)))

    # 6) stock before peaks ------------------------------------------------------------------------------
    f7 = fc[(fc["grain"] == "item")].copy()
    f7["date"] = pd.to_datetime(f7["date"])
    top_fc = f7.groupby("entity_id")["forecast_units"].sum().sort_values(ascending=False).head(5)
    for eid, units in top_fc.items():
        name = mc.set_index("item_id")["item_name"].get(eid, eid)
        add("inventory", f"Pre-stock {name} ({eid})", eid,
            f"Raise prep/stock to cover ~{units:.0f} forecast units over 28 days.",
            [f"forecast {units:.0f} units / 28d"], "forecast", "Medium", 0)

    # 7) target segments ------------------------------------------------------------------------------------
    hv_risk = ch[(ch["band"].isin(["high", "critical"]))
                 & (ch["segment"] == "High-Value Loyal Customers")]
    if len(hv_risk):
        add("customer_targeting",
            f"Win back {len(hv_risk)} at-risk high-value customers", "segment:High-Value Loyal",
            "Personal outreach + tailored offer within 7 days.",
            [f"{len(hv_risk)} HV customers high/critical churn risk",
             f"Rs.{hv_risk['monetary'].sum():.0f} historical spend at stake"],
            "churn", "Critical", float(hv_risk["monetary"].sum()))

    # 8) review ineffective promos -----------------------------------------------------------------------------
    bad_promos = eff[~eff["successful"]].sort_values("margin_lift").head(4)
    for _, r in bad_promos.iterrows():
        trapped = r["promotion_id"] in set(traps["promotion_id"].tolist()) if len(traps) else False
        add("promotion_review", f"{'STOP trap' if trapped else 'Review'} {r['promotion_name']}",
            r["promotion_id"],
            "End or redesign: margin lift "
            f"{r['margin_lift']:.0%} vs revenue lift {r['revenue_lift']:.0%}.",
            [f"margin lift {r['margin_lift']:.0%}", f"revenue lift {r['revenue_lift']:.0%}",
             f"repeaters {r['repeaters_30d']}"], "promotions",
            "Critical" if trapped else "High", abs(r["base_margin"] - r["win_margin"])
            if r["win_margin"] < r["base_margin"] else 0)

    # 9) investigate anomalous locations -------------------------------------------------------------------------------
    loc_an = an[an["entity"].str.startswith("restaurant:", na=False)]
    if len(loc_an):
        top_loc = loc_an["entity"].value_counts().head(3)
        for ent, n in top_loc.items():
            crit = int(((loc_an["entity"] == ent) & (loc_an["severity"] == "critical")).sum())
            add("location_investigation", f"Investigate {ent} ({n} anomalies)", ent,
                "Audit POS data, staffing, and stock for flagged dates.",
                [f"{n} anomalies ({crit} critical)"], "anomalies",
                "Critical" if crit else "High", 0)

    recs_df = pd.DataFrame(recs)
    recs_df.to_parquet(proc / "recommendations.parquet", index=False)
    report = {"recommendations": len(recs_df),
              "by_priority": recs_df["priority"].value_counts().to_dict(),
              "by_type": recs_df["type"].value_counts().to_dict()}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    res = run(PROCESSED_DIR)
    (REPORTS_DIR / "recommendations_report.json").write_text(json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/recommendations_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
