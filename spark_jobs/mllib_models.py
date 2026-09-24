"""STEP 12 — Spark MLlib Model Development (SRS §1.2 Step 12, FR xlii/xlvi).

Two tasks, each with ≥3 (clf) / 3 (reg) algorithms trained and compared:
  A) High-value customer prediction (binary; label = generator hidden segment
     'High-Value Loyal' — models must rediscover it from BEHAVIORAL features
     only; true_segment is never a feature).
  B) Daily demand regression (item x restaurant x date; window lag features).

Deterministic splits shared *by definition* with the Python pipeline
(hash-split for customers, last-28-days for demand) so Step 14 compares
equivalent unseen records. Writes models/spark_* + reports/spark_models.json
and registers versions in models/registry.json (FR lxii).

Usage: python -m spark_jobs.mllib_models
"""
import json
import sys
from datetime import datetime
from pathlib import Path

from pyspark.ml import Pipeline
from pyspark.ml.classification import (GBTClassifier, LogisticRegression,
                                       RandomForestClassifier)
from pyspark.ml.evaluation import (BinaryClassificationEvaluator,
                                   MulticlassClassificationEvaluator,
                                   RegressionEvaluator)
from pyspark.ml.feature import StringIndexer, VectorAssembler
from pyspark.ml.regression import (GBTRegressor, LinearRegression,
                                   RandomForestRegressor)
from pyspark.sql import functions as F
from pyspark.sql.window import Window

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import MODELS_DIR, PARQUET_DIR, REPORTS_DIR, RANDOM_SEED  # noqa: E402
from spark_jobs.spark_session import get_spark  # noqa: E402

CLF_FEATURES = ["recency_days", "frequency", "monetary", "aov", "weekend_ratio",
                "peak_hour_freq", "promo_sensitivity", "basket_size",
                "category_diversity", "tenure_days"]
REG_FEATURES = ["dow", "month", "is_weekend", "trend_idx", "lag_7", "lag_14",
                "lag_28", "roll_7", "roll_28"]


def _register(name, version, task, train_range, params, metrics, artifact):
    reg_path = MODELS_DIR / "registry.json"
    reg = json.loads(reg_path.read_text()) if reg_path.exists() else []
    reg.append({"name": name, "version": version, "pipeline": "spark", "task": task,
                "trained_at": datetime.now().isoformat(), "train_range": train_range,
                "params": params, "metrics": metrics, "artifact_path": artifact})
    reg_path.write_text(json.dumps(reg, indent=2))


def task_high_value_customer(spark, proc: Path, out: dict):
    fc = spark.read.parquet(str(proc / "feat_customer.parquet"))
    cust = spark.read.parquet(str(PARQUET_DIR / "clean" / "customers.parquet"))
    df = fc.join(cust.select("customer_id", "true_segment"), "customer_id")
    df = df.withColumn("label", F.when(F.col("true_segment") == "High-Value Loyal", 1).otherwise(0))
    df = df.withColumn("split", F.abs(F.hash("customer_id")) % 100)
    train = df.filter("split < 60").fillna(0, subset=CLF_FEATURES)
    valid = df.filter("split >= 60 AND split < 80").fillna(0, subset=CLF_FEATURES)
    test = df.filter("split >= 80").fillna(0, subset=CLF_FEATURES)
    train_n, test_ids = train.count(), [r[0] for r in test.select("customer_id").collect()]

    assembler = VectorAssembler(inputCols=CLF_FEATURES, outputCol="features")
    algos = {
        "logreg": LogisticRegression(maxIter=50, elasticNetParam=0.5, regParam=0.01),
        "random_forest": RandomForestClassifier(numTrees=200, maxDepth=8, seed=RANDOM_SEED),
        "gbt": GBTClassifier(maxIter=100, maxDepth=5, seed=RANDOM_SEED),
    }
    acc_ev = MulticlassClassificationEvaluator(labelCol="label", metricName="accuracy")
    f1_ev = MulticlassClassificationEvaluator(labelCol="label", metricName="f1")
    auc_ev = BinaryClassificationEvaluator(labelCol="label", metricName="areaUnderROC")
    results, best, best_name, best_f1 = {}, None, None, -1.0
    for name, algo in algos.items():
        model = Pipeline(stages=[assembler, algo]).fit(train)
        pred = model.transform(valid)
        m = {"accuracy": round(acc_ev.evaluate(pred), 4), "f1": round(f1_ev.evaluate(pred), 4),
             "auc": round(auc_ev.evaluate(pred), 4)}
        results[name] = m
        print(f"  mllib hv-customer {name:14s} {m}")
        if m["f1"] > best_f1:
            best, best_name, best_f1 = model, name, m["f1"]
    test_pred = best.transform(test)
    test_m = {"accuracy": round(acc_ev.evaluate(test_pred), 4),
              "f1": round(f1_ev.evaluate(test_pred), 4),
              "auc": round(auc_ev.evaluate(test_pred), 4),
              "n_test": test.count()}
    art = f"models/spark_hv_{best_name}"
    best.write().overwrite().save(str(Path(art)))
    _register(f"spark_hv_{best_name}", "1.0", "high_value_customer",
              f"hash-split train60/valid20/test20 of {train_n} train rows",
              {"algorithm": best_name}, test_m, art)
    preds = [(r["customer_id"], int(r["label"]), float(r["prediction"]),
              float(r["probability"][1])) for r in
             test_pred.select("customer_id", "label", "prediction", "probability").collect()]
    out["high_value_customer"] = {"algorithms": results, "selected": best_name,
                                  "test": test_m, "test_ids": test_ids}
    return preds


def task_demand(spark, proc: Path, out: dict):
    dd = spark.read.parquet(str(proc / "feat_daily_demand.parquet"))
    dd = dd.withColumn("order_date", F.to_date("order_date"))
    w = Window.partitionBy("item_id", "restaurant_id").orderBy("order_date")
    dd = dd.withColumn("dow", F.dayofweek("order_date")).withColumn("month", F.month("order_date"))
    dd = dd.withColumn("is_weekend", F.when(F.col("dow").isin(6, 7), 1).otherwise(0))
    dd = dd.withColumn("trend_idx", F.row_number().over(w))
    for lag in (7, 14, 28):
        dd = dd.withColumn(f"lag_{lag}", F.lag("units", lag).over(w))
    dd = dd.withColumn("roll_7", F.avg("units").over(w.rowsBetween(-7, -1)))
    dd = dd.withColumn("roll_28", F.avg("units").over(w.rowsBetween(-28, -1)))
    dd = dd.filter("lag_28 IS NOT NULL").fillna(0)
    max_d = dd.select(F.max("order_date")).first()[0]
    test = dd.filter(F.col("order_date") > F.date_sub(F.lit(max_d), 28))
    train = dd.filter(F.col("order_date") <= F.date_sub(F.lit(max_d), 28))
    assembler = VectorAssembler(inputCols=REG_FEATURES, outputCol="features")
    algos = {
        "linear": LinearRegression(maxIter=50, elasticNetParam=0.5, labelCol="units"),
        "random_forest": RandomForestRegressor(numTrees=150, maxDepth=10, seed=RANDOM_SEED,
                                               labelCol="units"),
        "gbt": GBTRegressor(maxIter=80, maxDepth=5, seed=RANDOM_SEED, labelCol="units"),
    }
    rmse_ev = RegressionEvaluator(labelCol="units", metricName="rmse")
    mae_ev = RegressionEvaluator(labelCol="units", metricName="mae")
    r2_ev = RegressionEvaluator(labelCol="units", metricName="r2")
    results, best, best_name, best_rmse = {}, None, None, float("inf")
    for name, algo in algos.items():
        model = Pipeline(stages=[assembler, algo]).fit(train)
        pred = model.transform(test)
        m = {"rmse": round(rmse_ev.evaluate(pred), 4), "mae": round(mae_ev.evaluate(pred), 4),
             "r2": round(r2_ev.evaluate(pred), 4)}
        results[name] = m
        print(f"  mllib demand     {name:14s} {m}")
        if m["rmse"] < best_rmse:
            best, best_name, best_rmse = model, name, m["rmse"]
    art = f"models/spark_demand_{best_name}"
    best.write().overwrite().save(str(Path(art)))
    _register(f"spark_demand_{best_name}", "1.0", "demand_forecast",
              f"train <= max-28d ({train.count()} rows)", {"algorithm": best_name},
              results[best_name], art)
    out["demand"] = {"algorithms": results, "selected": best_name,
                     "n_test": test.count(), "max_date": str(max_d)}
    return best


def main() -> dict:
    spark = get_spark("dineiq-mllib")
    out = {}
    try:
        task_high_value_customer(spark, PARQUET_DIR / "processed", out)
        task_demand(spark, PARQUET_DIR / "processed", out)
    finally:
        spark.stop()
    (REPORTS_DIR / "spark_models.json").write_text(json.dumps(out, indent=2, default=str))
    print("Report -> reports/spark_models.json")
    return out


if __name__ == "__main__":
    main()
