"""STEP 13 — Independent Python Data Science Pipeline (SRS §1.2 Step 13,
FR xliii/xlvi). Plus STEPS 20–22 demand-forecast training/evaluation core.

Reads ONLY Python-pipeline data (processed_data/*). Never touches Spark
outputs or predictions. sklearn + scipy only (no Spark imports allowed here).

Tasks:
  A) High-value customer classification (LogReg / RandomForest / HistGB).
     Test IDs are the SAME unseen records the Spark pipeline evaluated
     (reports/spark_models.json -> test_ids): sharing the evaluation SET is
     required by SRS p.26 ("equivalent underlying records"); all training
     and predictions are independent.
  B) Daily demand regression (Ridge / RandomForest / HistGB + SeasonalNaive
     lag-7 baseline; chronological last-28-days test split, SRS Step 21).

Writes models/py_* (joblib), processed_data/pred_python_*.parquet,
reports/python_models.json, registry entries (FR lxii).

Usage: python -m python_pipeline.models
"""
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             mean_absolute_error, mean_squared_error,
                             precision_score, r2_score, recall_score,
                             roc_auc_score)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import MODELS_DIR, PROCESSED_DIR, REPORTS_DIR, RANDOM_SEED  # noqa: E402

CLF_FEATURES = ["recency_days", "frequency", "monetary", "aov", "weekend_ratio",
                "peak_hour_freq", "promo_sensitivity", "basket_size",
                "category_diversity", "tenure_days"]
REG_FEATURES = ["dow", "month", "is_weekend", "trend_idx", "lag_7", "lag_14",
                "lag_28", "roll_7", "roll_28"]


def mape_safe(y_true, y_pred):
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    nz = y_true != 0
    if not nz.any():
        return None, 0.0
    return float(np.mean(np.abs((y_true[nz] - y_pred[nz]) / y_true[nz])) * 100), float(nz.mean())


def _register(name, version, task, train_range, params, metrics, artifact):
    reg_path = MODELS_DIR / "registry.json"
    reg = json.loads(reg_path.read_text()) if reg_path.exists() else []
    reg.append({"name": name, "version": version, "pipeline": "python", "task": task,
                "trained_at": datetime.now().isoformat(), "train_range": train_range,
                "params": params, "metrics": metrics, "artifact_path": artifact})
    reg_path.write_text(json.dumps(reg, indent=2))


def task_customer(proc: Path, out: dict):
    fc = pd.read_parquet(proc / "feat_customer.parquet").fillna(0)
    cust = pd.read_parquet(proc / "clean" / "customers.parquet")[["customer_id", "true_segment"]]
    df = fc.merge(cust, on="customer_id")
    df["label"] = (df["true_segment"] == "High-Value Loyal").astype(int)

    spark_rep = json.loads((REPORTS_DIR / "spark_models.json").read_text())
    test_ids = set(spark_rep["high_value_customer"]["test_ids"])  # same unseen records
    test = df[df["customer_id"].isin(test_ids)].copy()
    rest = df[~df["customer_id"].isin(test_ids)].copy()
    # deterministic train/valid split of the rest (hash by id, independent of Spark)
    rest["h"] = rest["customer_id"].map(
        lambda s: int(hashlib.sha1(s.encode()).hexdigest(), 16) % 100)
    train, valid = rest[rest["h"] < 75], rest[rest["h"] >= 75]

    algos = {
        "logreg": LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced"),
        "random_forest": RandomForestClassifier(n_estimators=300, max_depth=10,
                                                class_weight="balanced",
                                                random_state=RANDOM_SEED, n_jobs=2),
        "histgb": HistGradientBoostingClassifier(max_iter=300, max_depth=6,
                                                 class_weight="balanced",
                                                 random_state=RANDOM_SEED),
    }
    Xtr, ytr = train[CLF_FEATURES].fillna(0), train["label"]
    Xva, yva = valid[CLF_FEATURES].fillna(0), valid["label"]
    results, fitted, best_f1, best_name = {}, {}, -1, None
    for name, algo in algos.items():
        algo.fit(Xtr, ytr)
        p = algo.predict(Xva)
        m = {"accuracy": round(float(accuracy_score(yva, p)), 4),
             "precision": round(float(precision_score(yva, p, zero_division=0)), 4),
             "recall": round(float(recall_score(yva, p, zero_division=0)), 4),
             "f1": round(float(f1_score(yva, p, zero_division=0)), 4),
             "auc": round(float(roc_auc_score(yva, algo.predict_proba(Xva)[:, 1])), 4)}
        results[name] = m
        fitted[name] = algo
        print(f"  pymodel hv-customer {name:14s} {m}")
        if m["f1"] > best_f1:
            best_f1, best_name = m["f1"], name
    Xte, yte = test[CLF_FEATURES].fillna(0), test["label"]
    best = fitted[best_name]
    pte = best.predict(Xte)
    test_m = {"accuracy": round(float(accuracy_score(yte, pte)), 4),
              "precision": round(float(precision_score(yte, pte, zero_division=0)), 4),
              "recall": round(float(recall_score(yte, pte, zero_division=0)), 4),
              "f1": round(float(f1_score(yte, pte, zero_division=0)), 4),
              "auc": round(float(roc_auc_score(yte, best.predict_proba(Xte)[:, 1])), 4),
              "n_test": len(yte),
              "confusion_matrix": confusion_matrix(yte, pte).tolist()}
    art = f"models/py_hv_{best_name}.joblib"
    joblib.dump({"model": best, "features": CLF_FEATURES}, art)
    _register(f"py_hv_{best_name}", "1.0", "high_value_customer",
              f"train {len(Xtr)} / valid {len(Xva)} / test {len(Xte)} (shared unseen test IDs)",
              {"algorithm": best_name}, test_m, art)
    pred = test[["customer_id"]].copy()
    pred["actual"] = yte.values
    pred["py_pred"] = pte
    pred["py_proba"] = best.predict_proba(Xte)[:, 1]
    pred.to_parquet(proc / "pred_python_customer.parquet", index=False)
    out["high_value_customer"] = {"algorithms": results, "selected": best_name, "test": test_m}


def _demand_frame(proc: Path) -> pd.DataFrame:
    dd = pd.read_parquet(proc / "feat_daily_demand.parquet").copy()
    dd["order_date"] = pd.to_datetime(dd["order_date"])
    dd = dd.sort_values(["item_id", "restaurant_id", "order_date"])
    g = dd.groupby(["item_id", "restaurant_id"])["units"]
    dd["dow"] = dd["order_date"].dt.dayofweek.map({0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 1})
    dd["month"] = dd["order_date"].dt.month
    dd["is_weekend"] = dd["dow"].isin([6, 7]).astype(int)
    dd["trend_idx"] = g.cumcount() + 1
    for lag in (7, 14, 28):
        dd[f"lag_{lag}"] = g.shift(lag)
    dd["roll_7"] = g.transform(lambda s: s.shift(1).rolling(7, min_periods=1).mean())
    dd["roll_28"] = g.transform(lambda s: s.shift(1).rolling(28, min_periods=1).mean())
    dd["naive_7"] = g.shift(7)  # seasonal-naive baseline: same weekday last week
    return dd.dropna(subset=["lag_28", "naive_7"]).reset_index(drop=True)


def task_demand(proc: Path, out: dict):
    dd = _demand_frame(proc)
    max_d = dd["order_date"].max()
    test = dd[dd["order_date"] > max_d - pd.Timedelta(days=28)].copy()
    train = dd[dd["order_date"] <= max_d - pd.Timedelta(days=28)].copy()
    Xtr, ytr = train[REG_FEATURES].fillna(0), train["units"].astype(float)
    Xte, yte = test[REG_FEATURES].fillna(0), test["units"].astype(float)

    def metrics(y, p):
        mape, cov = mape_safe(y, p)
        return {"rmse": round(float(np.sqrt(mean_squared_error(y, p))), 4),
                "mae": round(float(mean_absolute_error(y, p)), 4),
                "mape": round(mape, 2) if mape is not None else None,
                "mape_coverage": round(cov, 3), "r2": round(float(r2_score(y, p)), 4)}

    base = metrics(yte, test["naive_7"].astype(float))
    print(f"  pymodel demand    baseline-naive7 {base}")
    algos = {
        "ridge": Ridge(alpha=1.0, random_state=RANDOM_SEED),
        "random_forest": RandomForestRegressor(n_estimators=200, max_depth=12,
                                               random_state=RANDOM_SEED, n_jobs=2),
        "histgb": HistGradientBoostingRegressor(max_iter=300, max_depth=6,
                                                random_state=RANDOM_SEED),
    }
    results, fitted, best_rmse, best_name = {"baseline_naive7": base}, {}, float("inf"), None
    for name, algo in algos.items():
        algo.fit(Xtr, ytr)
        m = metrics(yte, algo.predict(Xte))
        results[name] = m
        fitted[name] = algo
        print(f"  pymodel demand    {name:14s} {m}")
        if m["rmse"] < best_rmse:
            best_rmse, best_name = m["rmse"], name
    art = f"models/py_demand_{best_name}.joblib"
    joblib.dump({"model": fitted[best_name], "features": REG_FEATURES}, art)
    _register(f"py_demand_{best_name}", "1.0", "demand_forecast",
              f"train <= {max_d - pd.Timedelta(days=28):%Y-%m-%d} ({len(Xtr)} rows)",
              {"algorithm": best_name}, results[best_name], art)
    pred = test[["item_id", "restaurant_id", "order_date"]].copy()
    pred["actual"] = yte.values
    pred["py_pred"] = fitted[best_name].predict(Xte)
    pred["naive_7"] = test["naive_7"].values
    pred["order_date"] = pred["order_date"].dt.strftime("%Y-%m-%d")
    pred.to_parquet(proc / "pred_python_demand.parquet", index=False)
    out["demand"] = {"algorithms": results, "selected": best_name,
                     "n_test": len(yte), "max_date": str(max_d.date())}


def main() -> dict:
    out = {}
    task_customer(PROCESSED_DIR, out)
    task_demand(PROCESSED_DIR, out)
    (REPORTS_DIR / "python_models.json").write_text(json.dumps(out, indent=2, default=str))
    print("Report -> reports/python_models.json")
    return out


if __name__ == "__main__":
    main()
