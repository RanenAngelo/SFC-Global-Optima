"""Independent Python cleaning (pandas) — same documented rulebook as the Spark
job (documentation/DATA_QUALITY_RULES.md), independently implemented for the
Python Data Science pipeline (SRS Step 13 foundation).

Reads raw CSVs (never Spark outputs). Writes processed_data/clean/*.parquet,
processed_data/quarantine/*.parquet, reports/python_cleaning_report.json.

Usage: python -m python_pipeline.cleaning [--data-dir PATH]
"""
import argparse
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import DATA_DIR, PROCESSED_DIR, REPORTS_DIR  # noqa: E402

FILES = {"restaurants": "Restaurants.csv", "menu_categories": "Menu_Categories.csv",
         "menu_items": "Menu_Items.csv", "pricing_history": "Pricing_History.csv",
         "customers": "Customers.csv", "promotions": "Promotions.csv",
         "orders": "Orders.csv", "order_items": "Order_Items.csv",
         "ratings": "Ratings.csv", "inventory": "Inventory.csv",
         "wastage": "Wastage.csv"}


def blank(s: pd.Series) -> pd.Series:
    return s.isna() | (s.astype(str).str.strip() == "")


def run(data_dir: Path) -> dict:
    raw = {t: pd.read_csv(data_dir / f) for t, f in FILES.items()}
    # normalize datetimes/dates (independent parsing from Spark path)
    raw["orders"]["order_datetime"] = pd.to_datetime(raw["orders"]["order_datetime"], errors="coerce")
    for c in ["opening_date"]:
        raw["restaurants"][c] = pd.to_datetime(raw["restaurants"][c], errors="coerce")
    raw["menu_items"]["introduced_date"] = pd.to_datetime(raw["menu_items"]["introduced_date"], errors="coerce")
    for c in ["effective_from", "effective_to"]:
        raw["pricing_history"][c] = pd.to_datetime(raw["pricing_history"][c], errors="coerce")
    raw["customers"]["signup_date"] = pd.to_datetime(raw["customers"]["signup_date"], errors="coerce")
    for c in ["start_date", "end_date"]:
        raw["promotions"][c] = pd.to_datetime(raw["promotions"][c], errors="coerce")
    raw["ratings"]["review_date"] = pd.to_datetime(raw["ratings"]["review_date"], errors="coerce")
    raw["inventory"]["date"] = pd.to_datetime(raw["inventory"]["date"], errors="coerce")
    raw["wastage"]["date"] = pd.to_datetime(raw["wastage"]["date"], errors="coerce")

    rest_ids = set(raw["restaurants"]["restaurant_id"].dropna())
    cust_ids = set(raw["customers"]["customer_id"].dropna())
    item_ids = set(raw["menu_items"]["item_id"].dropna())
    order_ids = set(raw["orders"]["order_id"].dropna())
    cat_ids = set(raw["menu_categories"]["category_id"].dropna())

    clean, quar, decisions = {}, {}, []

    def split(name, df, reason: pd.Series):
        is_q = reason.notna()
        q = df.loc[is_q].copy()
        q["_reason"] = reason.loc[is_q].astype(str)
        c = df.loc[~is_q].copy()
        for code, n in q["_reason"].value_counts().items():
            decisions.append({"table": name, "action": "quarantine", "rule": code, "rows": int(n)})
        return c, q

    # ---- orders ----
    o = raw["orders"].copy()
    o["_dup"] = o.duplicated("order_id", keep="first")
    reason = pd.Series(None, index=o.index, dtype=object)
    reason = reason.mask(o["_dup"], "DUP_PK")
    reason = reason.mask(reason.isna() & blank(o["customer_id"]), "MISSING_FK")
    reason = reason.mask(reason.isna() & ~blank(o["customer_id"]) & ~o["customer_id"].isin(cust_ids), "BAD_FK")
    reason = reason.mask(reason.isna() & ~o["restaurant_id"].isin(rest_ids), "BAD_FK")
    reason = reason.mask(reason.isna() & (o["total_amount"] < 0), "NEG_MONEY")
    reason = reason.mask(reason.isna() & o["order_datetime"].isna(), "BAD_DATE")
    clean["orders"], quar["orders"] = split("orders", o.drop(columns=["_dup"]), reason)

    # ---- order_items ----
    oi = raw["order_items"].copy()
    oi["_dup"] = oi.duplicated("order_item_id", keep="first")
    reason = pd.Series(None, index=oi.index, dtype=object)
    reason = reason.mask(oi["_dup"], "DUP_PK")
    reason = reason.mask(reason.isna() & blank(oi["item_id"]), "MISSING_FK")
    reason = reason.mask(reason.isna() & blank(oi["order_id"]), "MISSING_FK")
    reason = reason.mask(reason.isna() & ~blank(oi["item_id"]) & ~oi["item_id"].isin(item_ids), "BAD_FK")
    reason = reason.mask(reason.isna() & ~blank(oi["order_id"]) & ~oi["order_id"].isin(order_ids), "BAD_FK")
    reason = reason.mask(reason.isna() & (oi["quantity"].isna() | (oi["quantity"] <= 0)), "NEG_QTY")
    reason = reason.mask(reason.isna() & (oi["discount_pct"].isna() | (oi["discount_pct"] < 0)
                                          | (oi["discount_pct"] > 1)), "BAD_DISCOUNT")
    c_oi, q_oi = split("order_items", oi.drop(columns=["_dup"]), reason)
    expect = (c_oi["quantity"] * c_oi["unit_price"] * (1 - c_oi["discount_pct"])).round(2)
    fixed = (c_oi["line_total"] - expect).abs() > 0.05
    decisions.append({"table": "order_items", "action": "correct",
                      "rule": "TOTAL_MISMATCH", "rows": int(fixed.sum())})
    c_oi.loc[fixed, "line_total"] = expect[fixed]
    clean["order_items"], quar["order_items"] = c_oi, q_oi

    # ---- menu_items / ratings / customers / pricing / wastage / inventory / promos ----
    mi = raw["menu_items"]
    reason = pd.Series(None, index=mi.index, dtype=object)
    reason = reason.mask(mi["base_price"].isna() | (mi["base_price"] <= 0), "BAD_PRICE")
    reason = reason.mask(reason.isna() & ~mi["category_id"].isin(cat_ids), "BAD_FK")
    clean["menu_items"], quar["menu_items"] = split("menu_items", mi, reason)

    r = raw["ratings"]
    reason = pd.Series(None, index=r.index, dtype=object)
    reason = reason.mask(r["rating"].isna() | (r["rating"] < 1) | (r["rating"] > 5), "BAD_RATING")
    reason = reason.mask(reason.isna() & ~r["item_id"].isin(item_ids), "BAD_FK")
    reason = reason.mask(reason.isna() & r["review_date"].isna(), "BAD_DATE")
    clean["ratings"], quar["ratings"] = split("ratings", r, reason)

    c = raw["customers"].copy()
    n_city = int(blank(c["home_city"]).sum())
    c.loc[blank(c["home_city"]), "home_city"] = "Unknown"
    decisions.append({"table": "customers", "action": "correct",
                      "rule": "IMPUTE_CITY", "rows": n_city})
    dup = c.duplicated("customer_id", keep="first")
    decisions.append({"table": "customers", "action": "quarantine",
                      "rule": "DUP_PK", "rows": int(dup.sum())})
    quar["customers"] = c[dup].copy()
    quar["customers"]["_reason"] = "DUP_PK"
    clean["customers"] = c[~dup].copy()

    ph = raw["pricing_history"]
    reason = pd.Series(None, index=ph.index, dtype=object)
    reason = reason.mask(ph["effective_to"].notna() & ph["effective_from"].notna()
                         & (ph["effective_to"] < ph["effective_from"]), "BAD_DATE")
    reason = reason.mask(reason.isna() & (ph["price"].isna() | (ph["price"] <= 0)), "BAD_PRICE")
    reason = reason.mask(reason.isna() & ~ph["item_id"].isin(item_ids), "BAD_FK")
    clean["pricing_history"], quar["pricing_history"] = split("pricing_history", ph, reason)

    w = raw["wastage"]
    q1, q3 = w["wasted_qty"].quantile([0.25, 0.75])
    bound = float(q3 + 3 * (q3 - q1)) if q3 > q1 else 200.0
    reason = pd.Series(None, index=w.index, dtype=object)
    reason = reason.mask(w["wasted_qty"].isna() | (w["wasted_qty"] <= 0) | (w["wasted_qty"] > bound),
                         "EXTREME_WASTE")
    reason = reason.mask(reason.isna() & ~w["item_id"].isin(item_ids), "BAD_FK")
    reason = reason.mask(reason.isna() & ~w["restaurant_id"].isin(rest_ids), "BAD_FK")
    clean["wastage"], quar["wastage"] = split("wastage", w, reason)

    inv = raw["inventory"]
    reason = pd.Series(None, index=inv.index, dtype=object)
    reason = reason.mask((inv["stock_level"] < 0) | (inv["consumed_qty"] < 0)
                         | (inv["replenished_qty"] < 0), "NEG_STOCK")
    reason = reason.mask(reason.isna() & ~inv["item_id"].isin(item_ids), "BAD_FK")
    reason = reason.mask(reason.isna() & ~inv["restaurant_id"].isin(rest_ids), "BAD_FK")
    clean["inventory"], quar["inventory"] = split("inventory", inv, reason)

    p = raw["promotions"]
    reason = pd.Series(None, index=p.index, dtype=object)
    reason = reason.mask(p["end_date"] < p["start_date"], "BAD_DATE")
    clean["promotions"], quar["promotions"] = split("promotions", p, reason)

    clean["restaurants"], clean["menu_categories"] = raw["restaurants"], raw["menu_categories"]

    clean_dir, quar_dir = PROCESSED_DIR / "clean", PROCESSED_DIR / "quarantine"
    clean_dir.mkdir(parents=True, exist_ok=True)
    quar_dir.mkdir(parents=True, exist_ok=True)
    report = {"tables": {}, "decisions": decisions, "wastage_bound": bound}
    for name, df in clean.items():
        df.to_parquet(clean_dir / f"{name}.parquet", index=False)
        q = quar.get(name)
        nq = 0 if q is None else len(q)
        if q is not None and len(q):
            q.to_parquet(quar_dir / f"{name}.parquet", index=False)
        report["tables"][name] = {"accepted": len(df), "rejected": nq}
        print(f"  pyclean {name:16s} accepted={len(df):>7,} rejected={nq:>6,}")
    return report


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(DATA_DIR))
    args = ap.parse_args()
    report = run(Path(args.data_dir))
    out = REPORTS_DIR / "python_cleaning_report.json"
    out.write_text(json.dumps(report, indent=2, default=str))
    print(f"Report -> {out}")
    return report


if __name__ == "__main__":
    main()
