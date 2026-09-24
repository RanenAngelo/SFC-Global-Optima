"""STEP 2 — Big Data Storage (SRS §1.2 Step 2, FR xviii).

Demonstrates the required storage formats for the team dataset:
  CSV      raw team dataset (Ranen/*.csv — already in repo)
  Parquet  raw mirror + (after Step 6) large PROCESSED datasets (partitioned)
  RDB      SQLite serving database (database/dineiq.db) via src/common/models
  JSON     reports + data dictionary + small reference extracts
  (NoSQL/document shape is demonstrated by the JSON extracts.)

Usage:  python -m python_pipeline.storage [--data-dir PATH]
Writes: parquet_data/raw/*.parquet, database/dineiq.db (raw_* tables),
        sample_data/raw/*.csv (200-row extracts), reports/storage_manifest.json
"""
import argparse
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import DATA_DIR, PARQUET_DIR, REPORTS_DIR, ROOT  # noqa: E402
from src.common import db as dbmod  # noqa: E402
from src.common.models import Base  # noqa: E402

TABLE_FILES = {
    "restaurants": "Restaurants.csv",
    "menu_categories": "Menu_Categories.csv",
    "menu_items": "Menu_Items.csv",
    "pricing_history": "Pricing_History.csv",
    "customers": "Customers.csv",
    "promotions": "Promotions.csv",
    "orders": "Orders.csv",
    "order_items": "Order_Items.csv",
    "ratings": "Ratings.csv",
    "inventory": "Inventory.csv",
    "wastage": "Wastage.csv",
}


def save_parquet(df: pd.DataFrame, name: str, partition_cols=None) -> Path:
    """Write a (possibly partitioned) Parquet dataset. Single source of truth
    for all Parquet writes so partitioning stays consistent (FR xvii)."""
    out = PARQUET_DIR / name
    df.to_parquet(out, index=False, partition_cols=partition_cols)
    return out


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(DATA_DIR))
    args = ap.parse_args()
    data_dir = Path(args.data_dir)

    raw_dir = PARQUET_DIR / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    sample_dir = ROOT / "sample_data" / "raw"
    sample_dir.mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(dbmod.engine)
    manifest = {"formats": ["CSV (raw, in repo)", "Parquet (mirror)", "SQLite (RDB)", "JSON (extracts)"],
                "tables": {}}
    for table, fname in TABLE_FILES.items():
        df = pd.read_csv(data_dir / fname)
        df.to_parquet(raw_dir / f"{table}.parquet", index=False)
        df.head(200).to_csv(sample_dir / f"{fname}", index=False)
        df.to_sql(f"raw_{table}", dbmod.engine, if_exists="replace", index=False)
        manifest["tables"][table] = {
            "rows": len(df),
            "parquet": f"parquet_data/raw/{table}.parquet",
            "sqlite": f"raw_{table}",
            "sample": f"sample_data/raw/{fname}",
        }
        print(f"  stored {table:16s} {len(df):>7,} rows -> parquet + sqlite(raw_{table}) + sample")

    (REPORTS_DIR / "storage_manifest.json").write_text(json.dumps(manifest, indent=2))
    print("Manifest -> reports/storage_manifest.json")
    return manifest


if __name__ == "__main__":
    main()
