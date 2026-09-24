"""DineIQ Analytics — database engine/session (SQLite default, SRS §1.9.2.5)."""
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config.settings import DB_URL  # noqa: E402

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session():
    return SessionLocal()
