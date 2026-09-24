# Dual-Pipeline Model Comparison Report (SRS Step 14, §1.10.7)

## 1. High-value customer (classification, unseen test set)
- Unseen records: 566
- Agreement: 77.74% (126 disagreements)
- Spark test: {'accuracy': 0.8816, 'macro_f1': 0.5739, 'auc': 0.806}
- Python test: {'accuracy': 0.7898, 'macro_f1': 0.6534, 'auc': 0.795}
- Majority baseline accuracy: 0.8763
- Explanation: Both models train independently (Spark MLlib vs sklearn) on equivalent behavioral features with a shared unseen test set. Disagreements cluster on borderline customers (medium frequency/monetary between loyal and occasional bands) where the two algorithms' decision boundaries differ; regularization (Spark elastic-net vs sklearn balanced weights) shifts probability calibration, visible in proba_diff. Neither pipeline sees the other's predictions.

## 2. Demand forecast (regression, last-28-days cells)
- Unseen cells: 144
- Spark MAE: 0.8666 | Python MAE: 0.7645
- Prediction-vs-prediction MAE: 0.4035, corr nan
- Within ±1 unit: 99.31%
- Explanation: Both regressors train independently (MLlib RandomForest vs sklearn HistGB) on equivalent lag/rolling features over the same chronological test cells. Residual gaps come from different tree ensembles and sparsity handling; sparse (item, restaurant, day) cells dominate the error mass on both sides.

Row-level evidence: reports/dual_compare_customer.csv, reports/dual_compare_demand.csv
