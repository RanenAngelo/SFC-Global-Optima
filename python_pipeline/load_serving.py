"""Serving-database loader: Python-pipeline outputs -> SQLite (SRS FR lxi).

Loads cleaned entities into the ORM tables plus all analytics tables, seeds
RBAC users (FR i–ii), imports the model registry (FR lxii). Idempotent.

Usage: python -m python_pipeline.load_serving
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import MODELS_DIR, PROCESSED_DIR  # noqa: E402
from src.common import db as dbmod  # noqa: E402
from src.common.models import Base, ModelRegistry, User  # noqa: E402

import bcrypt as _bcrypt


class _Pwd:
    @staticmethod
    def hash(pw: str) -> str:
        return _bcrypt.hashpw(pw.encode()[:72], _bcrypt.gensalt()).decode()


pwd = _Pwd()

SEED_USERS = [("admin", "DineIQ-Admin-123", "admin"),
              ("manager", "DineIQ-Manager-123", "manager"),
              ("analyst", "DineIQ-Analyst-123", "analyst"),
              ("viewer", "DineIQ-Viewer-123", "viewer"),
              ("evaluator", "DineIQ-Eval-2026", "viewer")]

ENTITY_TABLES = ["restaurants", "menu_categories", "menu_items", "pricing_history",
                 "customers", "promotions", "orders", "order_items", "ratings",
                 "inventory", "wastage"]
ANALYTICS_TABLES = ["fact_order_lines", "menu_performance", "menu_classified",
                    "customer_segments", "basket_itemsets", "basket_rules",
                    "basket_bundles", "peaks", "forecasts", "wastage_summary",
                    "wastage_risk", "price_elasticity", "promo_effectiveness",
                    "promo_traps", "rating_summary", "rating_anomalies",
                    "anomalies", "slow_movers", "location_intelligence",
                    "location_menu_class", "channel_analysis", "churn_risk",
                    "recommendations", "fact_ratings", "fact_wastage"]


def main():
    Base.metadata.create_all(dbmod.engine)
    for t in ENTITY_TABLES:
        df = pd.read_parquet(PROCESSED_DIR / "clean" / f"{t}.parquet")
        df.to_sql(t, dbmod.engine, if_exists="replace", index=False)
        print(f"  serve entity   {t:20s} {len(df):>8,} rows")
    for t in ANALYTICS_TABLES:
        p = PROCESSED_DIR / f"{t}.parquet"
        if not p.exists():
            print(f"  serve analytics {t:20s} MISSING (skipped)")
            continue
        df = pd.read_parquet(p)
        for c in df.columns:  # SQLite-safe: stringify any non-scalar cells
            if len(df) and df[c].map(lambda v: isinstance(
                    v, (list, dict, tuple, set)) or "numpy" in type(v).__module__
                    and hasattr(v, "tolist")).any():
                def _s(v):
                    if hasattr(v, "tolist"):
                        v = v.tolist()
                    return json.dumps(v, default=str) if isinstance(v, (list, dict)) else v
                df[c] = df[c].map(_s)
        df.to_sql(t, dbmod.engine, if_exists="replace", index=False)
        print(f"  serve analytics {t:20s} {len(df):>8,} rows")
    with dbmod.engine.begin() as con:
        for idx in ["CREATE INDEX IF NOT EXISTS ix_fol_date ON fact_order_lines(order_datetime)",
                    "CREATE INDEX IF NOT EXISTS ix_fol_rest ON fact_order_lines(restaurant_id)",
                    "CREATE INDEX IF NOT EXISTS ix_fol_item ON fact_order_lines(item_id)",
                    "CREATE INDEX IF NOT EXISTS ix_fol_cat ON fact_order_lines(category_id)",
                    "CREATE INDEX IF NOT EXISTS ix_fc_grain ON forecasts(grain, entity_id)",
                    "CREATE INDEX IF NOT EXISTS ix_ord_dt ON orders(order_datetime)"]:
            con.exec_driver_sql(idx)
    s = dbmod.get_session()
    for username, password, role in SEED_USERS:
        if not s.query(User).filter_by(username=username).first():
            s.add(User(username=username, password_hash=pwd.hash(password), role=role))
    s.commit()
    reg = json.loads((MODELS_DIR / "registry.json").read_text()) if (MODELS_DIR / "registry.json").exists() else []
    s.query(ModelRegistry).delete()
    for r in reg:
        s.add(ModelRegistry(name=r["name"], version=r["version"], pipeline=r["pipeline"],
                            task=r["task"], train_range=r.get("train_range"),
                            params=json.dumps(r.get("params")), metrics=json.dumps(r.get("metrics")),
                            artifact_path=r.get("artifact_path")))
    s.commit()
    print(f"  serve users/registry: {len(SEED_USERS)} users, {len(reg)} models")
    print("Serving DB ready.")


if __name__ == "__main__":
    main()
