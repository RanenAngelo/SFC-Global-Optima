"""STEP 8 — Exploratory Data Analysis (SRS §1.2 Step 8).

Executes spark_sql/02_eda.sql (13 queries) against the processed star schema.
Writes reports/eda_report.json. Usage: python -m spark_jobs.eda
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import PARQUET_DIR, REPORTS_DIR, ROOT  # noqa: E402
from spark_jobs.spark_session import get_spark  # noqa: E402


def run(spark, proc: Path) -> dict:
    for view in ["fact_order_lines", "fact_ratings", "fact_wastage", "fact_inventory",
                 "dim_menu_price", "feat_item", "feat_customer", "feat_location"]:
        spark.read.parquet(str(proc / f"{view}.parquet")).createOrReplaceTempView(view)
    sql = (ROOT / "spark_sql" / "02_eda.sql").read_text()
    # split into (name, statement) on the -- Qnn name headers
    parts = re.split(r"-- (Q\d+ \w+)[^\n]*\n", sql)
    out = {}
    for i in range(1, len(parts), 2):
        name = parts[i].split(" ", 1)[1]
        stmt = parts[i + 1].strip().rstrip(";")
        if not stmt or stmt.startswith("--"):
            continue
        rows = [r.asDict() for r in spark.sql(stmt).collect()]
        out[name] = rows
        print(f"  eda {name:28s} {len(rows):>4} rows")
    return out


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--proc", default=str(PARQUET_DIR / "processed"))
    args = ap.parse_args()
    spark = get_spark("dineiq-eda")
    try:
        out = run(spark, Path(args.proc))
    finally:
        spark.stop()
    (REPORTS_DIR / "eda_report.json").write_text(json.dumps(out, indent=2, default=str))
    print("Report -> reports/eda_report.json")
    return out


if __name__ == "__main__":
    main()
