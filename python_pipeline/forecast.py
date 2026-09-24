"""STEP 20 — Demand Forecasting, production serving (SRS §1.2 Step 20, FR xxviii).
Model training/evaluation methodology lives in models.py (Steps 21–22:
chronological splits, MAE/RMSE/MAPE/R², naive baseline).

Hierarchical global-model design (one HistGB per grain, recursive multi-step):
  grains: item_x_restaurant (dense) / item / category / restaurant / global
Fallback chain per series (documented, no silent failure):
  model (>=35 history rows) -> seasonal-naive-7 (>=14 rows) -> grain mean ->
  parent-grain mean (new/sparse items, SRS Step 11 "insufficient history").

Writes processed_data/forecasts.parquet + reports/forecast_report.json.
Usage: python -m python_pipeline.forecast [--horizon 28]
"""
import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import MODELS_DIR, PROCESSED_DIR, REPORTS_DIR, RANDOM_SEED  # noqa: E402

REG_FEATURES = ["dow", "month", "is_weekend", "trend_idx", "lag_7", "lag_14",
                "lag_28", "roll_7", "roll_28", "series_mean"]


def add_features(dd: pd.DataFrame, keys: list) -> pd.DataFrame:
    dd = dd.sort_values(keys + ["order_date"]).copy()
    g = dd.groupby(keys)["units"]
    dd["dow"] = dd["order_date"].dt.dayofweek.map({0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 1})
    dd["month"] = dd["order_date"].dt.month
    dd["is_weekend"] = dd["dow"].isin([6, 7]).astype(int)
    dd["trend_idx"] = g.cumcount() + 1
    for lag in (7, 14, 28):
        dd[f"lag_{lag}"] = g.shift(lag)
    dd["roll_7"] = g.transform(lambda s: s.shift(1).rolling(7, min_periods=1).mean())
    dd["roll_28"] = g.transform(lambda s: s.shift(1).rolling(28, min_periods=1).mean())
    dd["series_mean"] = g.transform("mean")
    return dd


def recursive_forecast(hist: pd.Series, model, horizon: int, future_dates: pd.DatetimeIndex):
    """Recursive 1-step forecasts using lag/rolling features updated from
    prior predictions. hist: daily units indexed 0..n-1 (consecutive days)."""
    import pandas as pd
    y = list(hist.astype(float).values)
    out = []
    n0 = len(y)
    for h in range(horizon):
        i = n0 + h
        lags = {7: y[i - 7] if i - 7 >= 0 else y[-1],
                14: y[i - 14] if i - 14 >= 0 else y[-1],
                28: y[i - 28] if i - 28 >= 0 else y[-1]}
        r7 = float(np.mean(y[max(0, i - 7):i])) if i > 0 else 0.0
        r28 = float(np.mean(y[max(0, i - 28):i])) if i > 0 else 0.0
        d = future_dates[h]
        dow = {0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 1}[d.dayofweek]
        x = pd.DataFrame([{**{"dow": dow, "month": d.month,
                           "is_weekend": int(dow in (6, 7)), "trend_idx": i + 1,
                           "lag_7": lags[7], "lag_14": lags[14], "lag_28": lags[28],
                           "roll_7": r7, "roll_28": r28,
                           "series_mean": float(np.mean(y))}}])[REG_FEATURES]
        p = max(0.0, float(model.predict(x)[0]))
        out.append(round(p, 2))
        y.append(p)
    return out


def naive7(y: list, horizon: int):
    y = list(map(float, y))
    out = []
    for _ in range(horizon):
        v = round(y[-7] if len(y) >= 7 else float(np.mean(y)), 2)
        out.append(v)
        y.append(v)
    return out


def run(proc: Path, horizon: int) -> dict:
    dd = pd.read_parquet(proc / "feat_daily_demand.parquet")
    dd["order_date"] = pd.to_datetime(dd["order_date"])
    dims = pd.read_parquet(proc / "dim_menu_price.parquet")[["item_id", "category_id"]]
    dd = dd.merge(dims, on="item_id", how="left")
    max_d = dd["order_date"].max()
    future = pd.date_range(max_d + pd.Timedelta(days=1), periods=horizon, freq="D")

    grains = {
        "item": (["item_id"], None),
        "category": (["category_id"], None),
        "restaurant": (["restaurant_id"], None),
        "item_x_restaurant": (["item_id", "restaurant_id"], None),
    }
    rows, methods = [], {}
    for grain, (keys, _) in grains.items():
        gdf = dd.groupby(keys + ["order_date"])["units"].sum().reset_index()
        counts = gdf.groupby(keys)["order_date"].count()
        dense_keys = set(counts[counts >= 35].index)
        feat = add_features(gdf, keys).dropna(subset=["lag_28"])
        model = None
        if len(feat) >= 200:
            model = HistGradientBoostingRegressor(max_iter=200, max_depth=6,
                                                  random_state=RANDOM_SEED)
            model.fit(feat[REG_FEATURES].fillna(0), feat["units"].astype(float))
            joblib.dump({"model": model, "features": REG_FEATURES, "grain": grain},
                        MODELS_DIR / f"py_forecast_{grain}.joblib")
        for key, grp in gdf.groupby(keys):
            lk = key[0] if isinstance(key, tuple) and len(keys) == 1 else key
            eid = "|".join(map(str, key if isinstance(key, tuple) else (key,)))
            grp = grp.sort_values("order_date")
            # reindex to consecutive days (fill gaps with 0 — documented)
            full_idx = pd.date_range(grp["order_date"].min(), max_d, freq="D")
            s = grp.set_index("order_date")["units"].reindex(full_idx, fill_value=0)
            n_hist = len(grp)
            if model is not None and lk in dense_keys:
                preds, method = recursive_forecast(s, model, horizon, future), "histgb_recursive"
            elif n_hist >= 14:
                preds, method = naive7(s.tolist(), horizon), "seasonal_naive_7"
            else:
                preds = [round(float(s.mean()), 2)] * horizon
                method = "grain_mean_fallback"
            methods[method] = methods.get(method, 0) + 1
            for d, p in zip(future, preds):
                rows.append({"grain": grain, "entity_id": eid, "date": d.strftime("%Y-%m-%d"),
                             "forecast_units": p, "method": method,
                             "history_rows": n_hist})
    fc = pd.DataFrame(rows)
    fc.to_parquet(proc / "forecasts.parquet", index=False)
    report = {"horizon_days": horizon, "history_max_date": str(max_d.date()),
              "forecast_rows": len(fc), "methods": methods,
              "grains": sorted(fc["grain"].unique().tolist())}
    print(json.dumps(report, indent=2))
    return {"report": report}


def main() -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--horizon", type=int, default=28)
    args = ap.parse_args()
    res = run(PROCESSED_DIR, args.horizon)
    (REPORTS_DIR / "forecast_report.json").write_text(json.dumps(res["report"], indent=2))
    print("Report -> reports/forecast_report.json")
    return res["report"]


if __name__ == "__main__":
    main()
