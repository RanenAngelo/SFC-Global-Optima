# Data-Quality Rules (SRS Steps 4–5, FR xiv–xv)

One documented rulebook implemented **twice, independently**: `spark_jobs/cleaning.py`
(Spark pipeline) and `python_pipeline/cleaning.py` (Python pipeline). Both write the
same quarantine-reason codes so their outputs are comparable (Step 14).

## Reason codes
| Code | Meaning | Action |
|---|---|---|
| DUP_PK | Duplicate primary key (extra copies) | keep first, quarantine rest |
| MISSING_FK | Required FK blank (customer_id, item_id) | quarantine |
| BAD_FK | FK value has no parent record | quarantine |
| NEG_QTY | quantity <= 0 on an order line | quarantine |
| NEG_MONEY | total_amount < 0 (order) | quarantine |
| BAD_PRICE | menu base_price <= 0 or null | quarantine row from pricing; item flagged inactive |
| BAD_RATING | rating not in 1..5 | quarantine |
| BAD_DATE | unparseable date OR effective_to < effective_from OR end_date < start_date | quarantine |
| BAD_DISCOUNT | discount_pct < 0 or > 1 | quarantine |
| TOTAL_MISMATCH | line_total differs from qty*unit_price*(1-disc) by > 0.05 with otherwise valid inputs | **correct** (recompute), keep |
| EXTREME_WASTE | wasted_qty <= 0 or > Q3+3*IQR bound | quarantine |
| NEG_STOCK | stock/consumed/replenished < 0 | quarantine |
| IMPUTE_CITY | customers.home_city blank | **correct**: set 'Unknown', keep |

## Kept-but-flagged (never silently dropped)
- `status='Cancelled'` orders: kept in cleaned data AND in the fact table with their
  status; all sales/finance aggregations filter to Completed (documented in formulas).
- Unknown cities/items/locations in *hidden* data: quarantined with BAD_FK, counted,
  never crash the pipeline (SRS §1.8.9 hidden-data readiness).
