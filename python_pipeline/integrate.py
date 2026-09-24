"""Independent Python integration (pandas) — same 10 SRS relationships as
spark_sql/01_integration.sql, independently implemented (SRS Step 13).

Reads processed_data/clean/*.parquet (Python-cleaned, never Spark outputs).
Writes processed_data/{fact_order_lines,fact_ratings,fact_inventory,
fact_wastage,dim_menu_price}.parquet + reports/python_integration_report.json.

Usage: python -m python_pipeline.integrate
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PROCESSED_DIR, REPORTS_DIR  # noqa: E402


def run(clean_dir: Path, out_dir: Path) -> dict:
    c = {p.stem: pd.read_parquet(p) for p in clean_dir.glob("*.parquet")}

    fol = (c["order_items"].merge(c["orders"], on="order_id", suffixes=("", "_ord"))
           .merge(c["menu_items"], on="item_id", suffixes=("", "_menu"))
           .merge(c["menu_categories"], on="category_id")
           .merge(c["restaurants"], on="restaurant_id", suffixes=("", "_rest"))
           .merge(c["customers"], on="customer_id", how="left", suffixes=("", "_cust")))
    fol = fol.rename(columns={"promotion_id": "line_promotion_id",
                              "promotion_id_ord": "order_promotion_id",
                              "home_city": "customer_home_city",
                              "preferred_channel": "customer_preferred_channel",
                              "base_cost": "item_cost"})
    dt = pd.to_datetime(fol["order_datetime"])
    fol["order_date"] = dt.dt.date
    fol["order_month"] = dt.dt.strftime("%Y-%m")
    fol["order_year"] = dt.dt.year
    fol["dow"] = dt.dt.dayofweek + 1  # 1=Mon..7=Sun (match Spark dayofweek? Spark: 1=Sun)
    # NOTE: Spark dayofweek: 1=Sunday..7=Saturday. Align explicitly:
    fol["dow"] = dt.dt.dayofweek.map({0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 1})
    fol["order_hour"] = dt.dt.hour
    fol["is_weekend"] = fol["dow"].isin([1, 7]).astype(int)  # Sun/Sat like Spark IN (6,7)? see below
    # Spark version used IN (6,7) on Spark-dow (Fri/Sat). Reproduce exactly:
    fol["is_weekend"] = fol["dow"].isin([6, 7]).astype(int)
    fol["line_cost"] = (fol["quantity"] * fol["item_cost"]).round(2)
    fol["line_margin"] = (fol["line_total"] - fol["line_cost"]).round(2)

    ph = c["pricing_history"].sort_values("effective_from")
    latest = ph.groupby("item_id").tail(1)[["item_id", "price", "effective_from"]]
    dim_menu_price = c["menu_items"].merge(
        latest.rename(columns={"price": "latest_price",
                               "effective_from": "price_effective_from"}),
        on="item_id", how="left")

    fact_ratings = (c["ratings"].merge(c["menu_items"][["item_id", "item_name", "category_id"]],
                                       on="item_id")
                    .merge(c["restaurants"][["restaurant_id", "city"]], on="restaurant_id"))
    fact_inventory = (c["inventory"].merge(c["menu_items"][["item_id", "item_name", "category_id"]],
                                           on="item_id")
                      .merge(c["restaurants"][["restaurant_id", "city"]], on="restaurant_id"))
    fact_wastage = (c["wastage"].merge(
        c["menu_items"][["item_id", "item_name", "category_id", "base_cost"]], on="item_id")
        .merge(c["restaurants"][["restaurant_id", "city"]], on="restaurant_id"))

    out_dir.mkdir(parents=True, exist_ok=True)
    report = {"outputs": {}}
    for name, df in [("fact_order_lines", fol), ("fact_ratings", fact_ratings),
                     ("fact_inventory", fact_inventory), ("fact_wastage", fact_wastage),
                     ("dim_menu_price", dim_menu_price)]:
        df.to_parquet(out_dir / f"{name}.parquet", index=False)
        report["outputs"][name] = {"rows": len(df)}
        print(f"  pyintegrate {name:18s} {len(df):>8,} rows")
    return report


def main() -> dict:
    report = run(PROCESSED_DIR / "clean", PROCESSED_DIR)
    out = REPORTS_DIR / "python_integration_report.json"
    out.write_text(json.dumps(report, indent=2, default=str))
    print(f"Report -> {out}")
    return report


if __name__ == "__main__":
    main()
