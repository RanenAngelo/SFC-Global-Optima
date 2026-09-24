"""DineIQ Analytics — central configuration (SRS §1.10.10/11, user §31/39).

All environment-specific values come from environment variables with safe
defaults. No secrets are committed (see .env.example).
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# -- Data locations ---------------------------------------------------------
# Raw dataset lives with the team dataset owner (Ranen/ per repo layout).
DATA_DIR = Path(os.getenv("DINEIQ_DATA_DIR", str(ROOT / "Ranen")))
PROCESSED_DIR = Path(os.getenv("DINEIQ_PROCESSED_DIR", str(ROOT / "processed_data")))
PARQUET_DIR = Path(os.getenv("DINEIQ_PARQUET_DIR", str(ROOT / "parquet_data")))
REPORTS_DIR = Path(os.getenv("DINEIQ_REPORTS_DIR", str(ROOT / "reports")))
MODELS_DIR = Path(os.getenv("DINEIQ_MODELS_DIR", str(ROOT / "models")))

# -- Database ---------------------------------------------------------------
DB_URL = os.getenv("DINEIQ_DB_URL", f"sqlite:///{ROOT / 'database' / 'dineiq.db'}")

# -- Auth -------------------------------------------------------------------
JWT_SECRET = os.getenv("DINEIQ_JWT_SECRET", "dev-only-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("DINEIQ_JWT_EXPIRE_MINUTES", "720"))

# -- Spark ------------------------------------------------------------------
SPARK_MASTER = os.getenv("DINEIQ_SPARK_MASTER", "local[2]")
SPARK_DRIVER_MEMORY = os.getenv("DINEIQ_SPARK_DRIVER_MEMORY", "2g")

# -- Business / display -----------------------------------------------------
CURRENCY_SYMBOL = os.getenv("DINEIQ_CURRENCY", "Rs.")
# Dataset monetary values are used as-is and displayed with CURRENCY_SYMBOL.
TIMEZONE = os.getenv("DINEIQ_TZ", "Asia/Karachi")

# -- ML ---------------------------------------------------------------------
RANDOM_SEED = int(os.getenv("DINEIQ_SEED", "42"))

for _d in (PROCESSED_DIR, PARQUET_DIR, REPORTS_DIR, MODELS_DIR):
    _d.mkdir(parents=True, exist_ok=True)
