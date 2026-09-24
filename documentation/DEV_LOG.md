# DineIQ Analytics — Development Log (SRS §1.8.3)

Team keeps this current: work completed, dataset changes, data-quality problems,
Spark failures, model failures, changes made, tests performed, performance work.

## 2026-09-24 — Foundation (Steps 1–2)
- Work completed: read SRS (52 pp); extracted 50 steps into
  documentation/IMPLEMENTATION_PLAN.md; merged origin/main (dineiq UI + SRS PDF)
  into working branch; created repo skeleton per SRS §1.10; root requirements.txt;
  AI_USAGE.md; config (settings + documented thresholds); SQLAlchemy models +
  database/schema.sql DDL; Step 1 verify_dataset.py; Step 2 storage.py
  (Parquet mirror + SQLite raw_* tables + 200-row samples + manifest).
- Dataset: Ranen/*.csv DEMO scale verified — 11 tables, 0 FK violations,
  90 duplicate Orders PKs (matches injected-DQ report), 13.7 months history,
  3/8 SRS volume minimums (items/categories/locations). FULL scale documented in
  documentation/DATASET_SCALE.md (DEMO_MODE=False re-run + DINEIQ_DATA_DIR).
- Environment: sandbox Python 3.11; no system Java/apt-internet. Solved Spark
  runtime via pip: pyspark 3.5.9 + jdk4py 17.0.9.2 (JAVA_HOME). Spark 3.5 fails
  on Java 25 (py4j reflection) — pinned Java 17. scripts/ensure_env.sh added.
- Data-quality problems (observed, to be handled in Steps 4–5): dup orders (90),
  missing customer/item IDs, negative amounts/quantities, invalid ratings/prices,
  extreme wastage (see Ranen/DATA_QUALITY_INJECTED_REPORT.json).
- Tests performed: verify_dataset run (report: reports/dataset_statistics.json);
  storage run (11 parquet mirrors + 26 sqlite tables incl. raw_*).
