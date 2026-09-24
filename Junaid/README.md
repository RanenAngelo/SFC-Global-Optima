# DineIQ Analytics — Dataset Generator

Generates a realistic, interconnected, multi-table restaurant dataset for the
DineIQ Analytics project — no internet connection or external API needed.

## What it creates

11 related CSV tables (+ one Parquet file) in `./output/`:

| Table | Description |
|---|---|
| `Restaurants.csv` | 20 restaurant locations across Pakistani cities |
| `Menu_Categories.csv` | 11 menu categories |
| `Menu_Items.csv` | 160 menu items with cost/price/margin + hidden behavior tags |
| `Pricing_History.csv` | Historical price changes per item |
| `Customers.csv` | Anonymized customers with a hidden "true_segment" |
| `Promotions.csv` | Promotion campaigns, some deliberately "traps" |
| `Orders.csv` | Order headers |
| `Order_Items.csv` | Order line items |
| `Ratings.csv` | Customer ratings, including an injected rating-anomaly burst |
| `Inventory.csv` | Daily-sampled inventory snapshots |
| `Wastage.csv` | Wastage records, concentrated in "high wastage" items |
| `fact_order_items.parquet` | Order_Items also saved in Parquet format |
| `DATA_DICTIONARY.md` | Auto-generated column reference for every table |
| `DATA_QUALITY_INJECTED_REPORT.json` | Exactly what problems were injected & how many rows |

## Why some columns look "hidden" / like cheating

Columns such as `demand_tier`, `wastage_tag`, `true_segment`, `is_trap_flag`,
`performance_tier` are **ground-truth tags used only to drive realistic
generation** (e.g. making sure some items really are high-wastage, some
customers really do behave like "At-Risk", some promotions really are
margin-destroying traps). Your analysis/ML pipelines should **not** simply
read these columns as a shortcut — they exist so you can validate whether
your own classification, segmentation, and anomaly-detection logic
correctly rediscovers these patterns from the raw transactional data. You
can drop or hide these columns before handing data to teammates who are
building the "blind" analysis, if you want a stricter test.

## How to run it

```bash
pip install -r requirements.txt
python generate_dataset.py
```

Output appears in `./output/`.

## Demo vs Full scale

At the top of `generate_dataset.py`:

```python
DEMO_MODE = True   # small & fast — use this while building your dashboard/pipelines
DEMO_MODE = False  # sized to meet the SRS competition minimums (takes longer)
```

Recommended workflow for a 5-day timeline:
1. Keep `DEMO_MODE = True` for Days 1–4 while you build Spark jobs, ML
   models, and the dashboard — it's fast to regenerate and iterate on.
2. Switch to `DEMO_MODE = False` on Day 5 once everything works, regenerate
   the final dataset, and re-run your pipelines once end-to-end before
   submission.

## Injected realism (for your Data Quality module)

The generator deliberately injects, and logs in
`DATA_QUALITY_INJECTED_REPORT.json`:
- Missing customer IDs / item IDs / cities
- Duplicate order rows
- Negative amounts / negative quantities
- Invalid ratings (0, 6, -1)
- Invalid menu prices (0)
- Extreme/impossible wastage quantities
- A burst of anomalous identical ratings for one item (rating-anomaly test case)
- Promotions tagged as "traps" (heavy discount, likely margin-destroying)
- New menu items with almost no order history
- Items tagged as price-sensitive, seasonal, promotion-dependent, or
  high-wastage, to make sure those SRS "tricky case" requirements have real
  examples to detect

## Notes

- Customers are fully anonymized (ID only, no names/emails), matching the
  SRS privacy requirement.
- Foreign keys are consistent across all tables (`customer_id`, `item_id`,
  `restaurant_id`, `order_id`, `promotion_id`, `category_id`).
- If Parquet export fails with an engine error, run
  `pip install pyarrow` (requires internet) and re-run the script.
