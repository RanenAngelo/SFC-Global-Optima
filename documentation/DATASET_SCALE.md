# Dataset Scale: DEMO (dev) vs FULL (competition) — SRS Step 1, p.24 hint

## Current repo data (Ranen/*.csv): DEMO scale
Generated with `DEMO_MODE = True` in `Ranen/generate_dataset.py` (seed 42).
Verified by `python -m python_pipeline.verify_dataset` → `reports/dataset_statistics.json`.

| SRS minimum (p.24) | Required | Current | Met |
|---|---|---|---|
| Order-line records | 1,000,000 | 24,950 | no (dev) |
| Unique orders | 100,000 | 9,090 (90 dup rows) | no (dev) |
| Customers | 50,000 | 4,000 | no (dev) |
| Menu items | 150 | 160 | YES |
| Menu categories | 10 | 11 | YES |
| Restaurant locations | 20 | 20 | YES |
| Months of history | 12 | 13.7 | YES |
| Rating records | 100,000 | 6,030 | no (dev) |
| Wastage records | 50,000 | 4,000 | no (dev) |
| Pricing history / promotions | multiple | 314 / 12 | YES |

All 11 required tables exist with correct PK/FK relationships. Every pipeline,
model, API, and test in this repo is scale-agnostic (chunked / partitioned /
Spark-distributed) and validated on DEMO data first, per the generator README's
recommended Day 1–4 workflow.

## Generating FULL competition scale (Day-5 step)
```bash
cd Ranen
# set DEMO_MODE = False at the top of generate_dataset.py
pip install -r requirements.txt
python generate_dataset.py          # writes ./output/*.csv (+ parquet)
# point pipelines at it:
export DINEIQ_DATA_DIR=/home/user/SFC-Global-Optima/Ranen/output
python -m python_pipeline.verify_dataset
```
Then re-run the full pipeline (Steps 3–7) and model training once end-to-end.
Expected FULL volumes: ~1M order lines, 100K orders, 50K customers, 100K ratings,
50K wastage, ~584K inventory rows. Generation takes significantly longer
(the order/item loop is the slow step); run it once and keep the outputs.
