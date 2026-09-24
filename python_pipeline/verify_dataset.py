"""STEP 1 — Restaurant Dataset Creation verification (SRS §1.2 Step 1 + p.24 hint).

Checks that the team dataset (Ranen/*.csv by default) contains the 11 required
related tables with the expected columns, primary-key uniqueness, and
foreign-key integrity. Compares volumes against the SRS competition minimums
and honestly reports DEMO vs FULL scale.

Usage:  python -m python_pipeline.verify_dataset [--data-dir PATH]
Writes: reports/dataset_statistics.json
"""
import argparse
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import DATA_DIR, REPORTS_DIR  # noqa: E402

# Table -> {file, pk, expected columns, fks: {col: (ref_table, ref_col)}}
SPEC = {
    "Restaurants": {"file": "Restaurants.csv", "pk": "restaurant_id",
                    "cols": ["restaurant_id", "restaurant_name", "city", "region",
                             "restaurant_type", "opening_date", "performance_tier"],
                    "fks": {}},
    "Menu_Categories": {"file": "Menu_Categories.csv", "pk": "category_id",
                        "cols": ["category_id", "category_name"], "fks": {}},
    "Menu_Items": {"file": "Menu_Items.csv", "pk": "item_id",
                   "cols": ["item_id", "item_name", "category_id", "base_cost", "base_price",
                            "is_active", "introduced_date", "demand_tier", "wastage_tag",
                            "price_sensitivity_tag", "seasonal_tag", "promo_dependent_tag"],
                   "fks": {"category_id": ("Menu_Categories", "category_id")}},
    "Pricing_History": {"file": "Pricing_History.csv", "pk": "price_id",
                        "cols": ["price_id", "item_id", "price", "effective_from", "effective_to"],
                        "fks": {"item_id": ("Menu_Items", "item_id")}},
    "Customers": {"file": "Customers.csv", "pk": "customer_id",
                  "cols": ["customer_id", "home_city", "signup_date", "preferred_channel",
                           "true_segment"],
                  "fks": {}},
    "Promotions": {"file": "Promotions.csv", "pk": "promotion_id",
                   "cols": ["promotion_id", "promotion_name", "scope", "target_id",
                            "discount_pct", "start_date", "end_date", "channel", "is_trap_flag"],
                   "fks": {}},
    "Orders": {"file": "Orders.csv", "pk": "order_id",
               "cols": ["order_id", "customer_id", "restaurant_id", "order_datetime",
                        "channel", "promotion_id", "status", "total_amount"],
               "fks": {"customer_id": ("Customers", "customer_id"),
                       "restaurant_id": ("Restaurants", "restaurant_id"),
                       "promotion_id": ("Promotions", "promotion_id")}},
    "Order_Items": {"file": "Order_Items.csv", "pk": "order_item_id",
                    "cols": ["order_item_id", "order_id", "item_id", "quantity",
                             "unit_price", "discount_pct", "promotion_id", "line_total"],
                    "fks": {"order_id": ("Orders", "order_id"),
                            "item_id": ("Menu_Items", "item_id"),
                            "promotion_id": ("Promotions", "promotion_id")}},
    "Ratings": {"file": "Ratings.csv", "pk": "rating_id",
                "cols": ["rating_id", "customer_id", "item_id", "restaurant_id",
                         "order_id", "rating", "review_date"],
                "fks": {"customer_id": ("Customers", "customer_id"),
                        "item_id": ("Menu_Items", "item_id"),
                        "restaurant_id": ("Restaurants", "restaurant_id"),
                        "order_id": ("Orders", "order_id")}},
    "Inventory": {"file": "Inventory.csv", "pk": "inventory_id",
                  "cols": ["inventory_id", "restaurant_id", "item_id", "date",
                           "stock_level", "consumed_qty", "replenished_qty"],
                  "fks": {"restaurant_id": ("Restaurants", "restaurant_id"),
                          "item_id": ("Menu_Items", "item_id")}},
    "Wastage": {"file": "Wastage.csv", "pk": "wastage_id",
                "cols": ["wastage_id", "restaurant_id", "item_id", "date",
                         "wasted_qty", "wastage_cost", "reason"],
                "fks": {"restaurant_id": ("Restaurants", "restaurant_id"),
                        "item_id": ("Menu_Items", "item_id")}},
}

# SRS p.24 minimums: (table, count column / row count, minimum)
MINIMUMS = [
    ("Order_Items rows (order-line records)", "Order_Items", 1_000_000),
    ("Orders unique order_id", "Orders", 100_000),
    ("Customers unique customer_id", "Customers", 50_000),
    ("Menu_Items unique item_id", "Menu_Items", 150),
    ("Menu_Categories rows", "Menu_Categories", 10),
    ("Restaurants rows", "Restaurants", 20),
    ("Ratings rows", "Ratings", 100_000),
    ("Wastage rows", "Wastage", 50_000),
]


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(DATA_DIR))
    args = ap.parse_args()
    data_dir = Path(args.data_dir)

    tables = {}
    for name, spec in SPEC.items():
        df = pd.read_csv(data_dir / spec["file"], dtype=str, keep_default_na=True)
        tables[name] = df

    report = {"data_dir": str(data_dir), "tables": {}, "minimums": [], "fk_violations": {},
              "pk_duplicates": {}, "months_of_history": None, "scale": None}

    for name, spec in SPEC.items():
        df = tables[name]
        missing_cols = [c for c in spec["cols"] if c not in df.columns]
        dup_pk = int(df.duplicated(subset=[spec["pk"]]).sum()) if spec["pk"] in df.columns else -1
        report["tables"][name] = {"rows": len(df), "columns": list(df.columns),
                                  "missing_columns": missing_cols}
        report["pk_duplicates"][name] = dup_pk

    for name, spec in SPEC.items():
        df = tables[name]
        for col, (ref_table, ref_col) in spec["fks"].items():
            if col not in df.columns:
                continue
            ref_ids = set(tables[ref_table][ref_col].dropna().astype(str))
            vals = df[col].dropna()
            vals = vals[vals.astype(str).str.strip() != ""]
            bad = vals[~vals.astype(str).isin(ref_ids)]
            if len(bad):
                report["fk_violations"].setdefault(name, {})[col] = {
                    "count": int(len(bad)), "examples": sorted(bad.astype(str).unique().tolist())[:5]}

    for label, table, minimum in MINIMUMS:
        df = tables[table]
        pk = SPEC[table]["pk"]
        actual = int(df[pk].nunique()) if table in ("Orders", "Customers", "Menu_Items") else len(df)
        report["minimums"].append({"check": label, "actual": actual, "minimum": minimum,
                                   "meets_minimum": actual >= minimum})
    met = sum(1 for m in report["minimums"] if m["meets_minimum"])
    report["scale"] = "FULL (meets all SRS minimums)" if met == len(report["minimums"]) \
        else f"DEMO/DEV SCALE ({met}/{len(report['minimums'])} SRS minimums met; " \
             "generate FULL scale with DEMO_MODE=False, see documentation/DATASET_SCALE.md)"

    orders = tables["Orders"]
    if "order_datetime" in orders.columns:
        dts = pd.to_datetime(orders["order_datetime"], errors="coerce").dropna()
        if len(dts):
            report["months_of_history"] = round((dts.max() - dts.min()).days / 30.4, 1)
            report["history_range"] = [str(dts.min()), str(dts.max())]

    out = REPORTS_DIR / "dataset_statistics.json"
    out.write_text(json.dumps(report, indent=2))
    print(json.dumps({"tables": {k: v["rows"] for k, v in report["tables"].items()},
                      "scale": report["scale"],
                      "months_of_history": report["months_of_history"],
                      "pk_duplicates": report["pk_duplicates"],
                      "fk_violations": report["fk_violations"]}, indent=2))
    print(f"Report -> {out}")
    return report


if __name__ == "__main__":
    main()
