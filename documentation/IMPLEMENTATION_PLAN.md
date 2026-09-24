# DineIQ Analytics — 50-Step Implementation Plan (SRS §1.2, exact order)

Source of truth: `Ranen/DineIQ Analytics-Data Science Intelligence Arena_SRS.pdf` (§1.2, pp. 7–24).
Rule: implement in this exact order; each step is COMPLETE only when implemented + tested + validated.

| Step | SRS Requirement | Status |
|------|-----------------|--------|
| 1 | Restaurant Dataset Creation (11 related tables, §1.2 hint minimums) | ✅ COMPLETE (DEMO scale verified; FULL via DEMO_MODE=False) |
| 2 | Big Data Storage (CSV/JSON/Parquet/RDB/NoSQL; ≥1 large processed Parquet) | ✅ COMPLETE (raw mirror; processed Parquet lands in Step 6) |
| 3 | Data Ingestion Using Apache Spark (explicit schema, inference, type validation, large/multi-file, partitions) | PENDING |
| 4 | Data Quality Assessment (14 issue classes) + Data Quality Report | PENDING |
| 5 | Data Cleaning (clean/correct/remove/quarantine; record every decision) | PENDING |
| 6 | Data Integration (Spark SQL/PySpark joins; 10 required relationships) | PENDING |
| 7 | Feature Engineering (22 SRS features) | PENDING |
| 8 | Exploratory Data Analysis (13 EDA outputs) | PENDING |
| 9 | Menu Profitability Analysis (10 dimensions; volume alone ≠ success) | PENDING |
| 10 | Menu Performance Classification (Profit/Volume Driver, Hidden Opportunity, Low Performer; data-driven) | PENDING |
| 11 | Tricky Menu Performance Cases (10 difficult scenarios handled) | PENDING |
| 12 | Spark MLlib Model Development (≥3 algorithms trained & compared) | PENDING |
| 13 | Independent Python Data Science Pipeline (same records, no Spark-result reuse) | PENDING |
| 14 | Dual-Pipeline Result Verification (comparison report + agreement %) | PENDING |
| 15 | Customer Segmentation (behavioral; 6 suggested segments) | PENDING |
| 16 | RFM Analysis (Recency/Frequency/Monetary per customer) | PENDING |
| 17 | Market-Basket Analysis (Support/Confidence/Lift) | PENDING |
| 18 | Bundle and Cross-Sell Recommendations (association-rule evidence) | PENDING |
| 19 | Peak-Period Analysis (hours/days/weekend/monthly/seasonal/location/channel) | PENDING |
| 20 | Demand Forecasting (items/categories/locations; configurable horizons) | PENDING |
| 21 | Time-Aware Model Validation (chronological split, no leakage) | PENDING |
| 22 | Forecast Accuracy Evaluation (MAE/RMSE/MAPE/R²) | PENDING |
| 23 | Wastage Analysis (9 breakdown dimensions) | PENDING |
| 24 | Wastage Risk Prediction (9 candidate predictors) | PENDING |
| 25 | Price Intelligence (price/demand/revenue/margin/discount/rating/repeat) | PENDING |
| 26 | Price-Sensitivity Analysis (Highly/Moderately/Low) | PENDING |
| 27 | Promotion Effectiveness Analysis (8 measures; sales ≠ success) | PENDING |
| 28 | Promotion Trap Detection (5 misleading patterns) | PENDING |
| 29 | Rating and Satisfaction Analysis (ratings vs 7 dimensions) | PENDING |
| 30 | Rating Anomaly Detection (5 unusual patterns) | PENDING |
| 31 | Sales Anomaly Detection (6 unusual event types) | PENDING |
| 32 | Slow-Moving Dish Detection (7 combined signals) | PENDING |
| 33 | Multi-Location Intelligence (9 comparison metrics) | PENDING |
| 34 | Location-Specific Menu Performance (per-location 4-class) | PENDING |
| 35 | Ordering Channel Analysis (channels × 7 comparisons) | PENDING |
| 36 | Customer Churn-Risk Identification (5 factors) | PENDING |
| 37 | Recommendation Engine (9 evidence-based recommendation types) | PENDING |
| 38 | Recommendation Evidence (every recommendation explained) | PENDING |
| 39 | Recommendation Priority (Low/Medium/High/Critical by business impact) | PENDING |
| 40 | What-If Scenario Analysis (8 scenario types) | PENDING |
| 41 | Scenario Impact Analysis (impact on 5 indicators; labelled estimates) | PENDING |
| 42 | Executive Dashboard (10 KPIs) | PENDING |
| 43 | Menu Intelligence Dashboard (9 elements) | PENDING |
| 44 | Customer Intelligence Dashboard (6 elements) | PENDING |
| 45 | Wastage Dashboard (6 elements) | PENDING |
| 46 | Forecast Dashboard (5 comparisons) | PENDING |
| 47 | Dual-Pipeline Comparison Dashboard (6 elements) | PENDING |
| 48 | Search and Filtering (11 filter types) | PENDING |
| 49 | Downloadable Reports (12 report types) | PENDING |
| 50 | Data Export (CSV/Excel-compatible, permission-gated) | PENDING |

Cross-cutting (SRS §1.6 Functional Requirements i–lxvi, §1.7 NFRs, §1.8 integrity):
auth + RBAC (i–ii), entity management (iii–xi), partitioning (xvii), model versioning (lxii),
audit trail (lxiii), error handling (lxiv), Spark job monitoring (lxv), responsive web (lxvi),
dual-pipeline dashboards, tests (§1.10.9), docs (§1.10.10–11), AI_USAGE.md (§1.8.13).
