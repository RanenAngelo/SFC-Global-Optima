"""STEP 6 — Data Integration (SRS §1.2 Step 6, FR xvi).

Registers cleaned parquet as temp views, executes spark_sql/01_integration.sql
(genuine Spark SQL joins — all 10 SRS relationships), persists the star schema
to parquet_data/processed/ (fact partitioned by order_month, FR xvii).

Writes: parquet_data/processed/{fact_order_lines,fact_ratings,fact_inventory,
        fact_wastage,dim_menu_price}.parquet + reports/integration_report.json

Usage: python -m spark_jobs.integrate
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PARQUET_DIR, REPORTS_DIR, ROOT  # noqa: E402
from spark_jobs.io import write_parquet  # noqa: E402
from spark_jobs.spark_session import get_spark  # noqa: E402

CLEAN_TABLES = ["restaurants", "menu_categories", "menu_items", "pricing_history",
                "customers", "promotions", "orders", "order_items", "ratings",
                "inventory", "wastage"]
OUTPUTS = {"fact_order_lines": ["order_month"], "fact_ratings": None,
           "fact_inventory": None, "fact_wastage": None, "dim_menu_price": None}


def run(spark, clean_dir: Path, out_dir: Path, sql_path: Path) -> dict:
    for t in CLEAN_TABLES:
        spark.read.parquet(str(clean_dir / f"{t}.parquet")).createOrReplaceTempView(f"clean_{t}")
    sql = sql_path.read_text()
    for stmt in [s.strip() for s in sql.split(";") if s.strip()]:
        spark.sql(stmt)
    report = {"outputs": {}}
    for view, part in OUTPUTS.items():
        df = spark.table(view)
        n = df.count()
        write_parquet(df, out_dir / f"{view}.parquet", partition_by=part)
        report["outputs"][view] = {"rows": n, "partitioned_by": part}
        print(f"  integrated {view:18s} {n:>8,} rows"
              + (f" (partitioned by {part})" if part else ""))
    return report


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clean-dir", default=str(PARQUET_DIR / "clean"))
    ap.add_argument("--out-dir", default=str(PARQUET_DIR / "processed"))
    args = ap.parse_args()
    spark = get_spark("dineiq-integrate")
    try:
        report = run(spark, Path(args.clean_dir), Path(args.out_dir),
                     ROOT / "spark_sql" / "01_integration.sql")
    finally:
        spark.stop()
    out = REPORTS_DIR / "integration_report.json"
    out.write_text(json.dumps(report, indent=2, default=str))
    print(f"Report -> {out}")
    return report


if __name__ == "__main__":
    main()
