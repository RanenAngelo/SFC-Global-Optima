"""STEPS 17–18 — Market-Basket Analysis + Bundle/Cross-sell Recommendations
(SRS §1.2 Steps 17–18, FR xxv–xxvii).

Apriori from first principles (no black-box lib): frequent itemsets up to size 3
then association rules with exact support / confidence / lift. Step-18 bundle,
cross-sell, and upsell suggestions are the top rules by lift × support, each
carrying its evidence.

Reads processed_data/fact_order_lines.parquet + clean/menu_items.
Writes processed_data/basket_{itemsets,rules,bundles}.parquet +
reports/basket_report.json.

Usage: python -m python_pipeline.basket [--min-support 0.02] [--min-conf 0.3]
"""
import argparse
import itertools
import json
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def apriori(transactions: list[frozenset], min_support: float, max_len: int = 3):
    n = len(transactions)
    counts = Counter()
    for t in transactions:
        counts.update(t)
    freq = {frozenset([i]): c / n for i, c in counts.items() if c / n >= min_support}
    all_freq = dict(freq)
    k = 2
    prev = set(freq)
    while prev and k <= max_len:
        cands = set()
        prev_list = sorted(prev, key=sorted)
        for i in range(len(prev_list)):
            for j in range(i + 1, len(prev_list)):
                u = prev_list[i] | prev_list[j]
                if len(u) == k and all(frozenset(s) in all_freq
                                       for s in itertools.combinations(u, k - 1)):
                    cands.add(u)
        if not cands:
            break
        cc = Counter()
        for t in transactions:
            for cnd in cands:
                if cnd <= t:
                    cc[cnd] += 1
        prev = {cnd for cnd, c in cc.items() if c / n >= min_support}
        for cnd in prev:
            all_freq[cnd] = cc[cnd] / n
        k += 1
    return all_freq, n


def rules_from_itemsets(freq: dict, n: int, min_conf: float) -> pd.DataFrame:
    rows = []
    for itemset, sup in freq.items():
        if len(itemset) < 2:
            continue
        for r in range(1, len(itemset)):
            for ant in itertools.combinations(itemset, r):
                ant, con = frozenset(ant), itemset - frozenset(ant)
                conf = sup / freq[ant]
                if conf >= min_conf:
                    lift = conf / freq[con]
                    rows.append({"antecedent": ",".join(sorted(ant)),
                                 "consequent": ",".join(sorted(con)),
                                 "support": round(sup, 4),
                                 "confidence": round(conf, 4),
                                 "lift": round(lift, 3),
                                 "transactions": int(sup * n)})
    rules = pd.DataFrame(rows)
    if len(rules):
        rules = rules.sort_values(["lift", "support"], ascending=False).reset_index(drop=True)
    return rules


def run(proc: Path, min_support: float, min_conf: float) -> dict:
    fol = pd.read_parquet(proc / "fact_order_lines.parquet")
    comp = fol[fol["status"] == "Completed"]
    tx = comp.groupby("order_id")["item_id"].apply(frozenset).tolist()
    freq, n = apriori(tx, min_support)
    itemsets = pd.DataFrame([{"itemset": ",".join(sorted(k)), "size": len(k),
                              "support": round(v, 4), "transactions": int(v * n)}
                             for k, v in sorted(freq.items(), key=lambda kv: -kv[1])])
    itemsets.to_parquet(proc / "basket_itemsets.parquet", index=False)
    rules = rules_from_itemsets(freq, n, min_conf)
    menu = pd.read_parquet(proc / "clean" / "menu_items.parquet").set_index("item_id")["item_name"]
    if len(rules):
        rules["antecedent_names"] = rules["antecedent"].map(
            lambda s: " + ".join(menu.get(i, i) for i in s.split(",")))
        rules["consequent_names"] = rules["consequent"].map(
            lambda s: " + ".join(menu.get(i, i) for i in s.split(",")))
    rules.to_parquet(proc / "basket_rules.parquet", index=False)

    # Step 18: bundles / cross-sell / upsell from top-evidence rules
    bundles = []
    for _, r in rules.head(15).iterrows():
        kind = "combo" if r["support"] >= 0.05 else ("cross-sell" if r["lift"] >= 2 else "upsell")
        bundles.append({
            "kind": kind,
            "offer": f"{r['antecedent_names']} + {r['consequent_names']}",
            "antecedent": r["antecedent"], "consequent": r["consequent"],
            "support": r["support"], "confidence": r["confidence"], "lift": r["lift"],
            "evidence": f"lift {r['lift']}, confidence {r['confidence']}, "
                        f"in {r['transactions']} orders"})
    bundles = pd.DataFrame(bundles)
    if len(bundles):
        bundles.to_parquet(proc / "basket_bundles.parquet", index=False)
    report = {"transactions": n, "min_support": min_support, "min_confidence": min_conf,
              "frequent_itemsets": len(itemsets), "rules": len(rules),
              "bundles": len(bundles),
              "top_rules": rules.head(5).to_dict("records") if len(rules) else []}
    print(json.dumps({k: v for k, v in report.items() if k != "top_rules"}, indent=2))
    return {"report": report}


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-support", type=float, default=0.02)
    ap.add_argument("--min-conf", type=float, default=0.3)
    args = ap.parse_args()
    res = run(PROCESSED_DIR, args.min_support, args.min_conf)
    (REPORTS_DIR / "basket_report.json").write_text(
        json.dumps(res["report"], indent=2, default=str))
    print("Report -> reports/basket_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
