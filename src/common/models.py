"""DineIQ Analytics — SQLAlchemy models (SRS Steps 1–2, FR iii–xi, lxi).

One model per SRS dataset table (§1.2 p.25) plus application tables
(users/RBAC FR i–ii, audit FR lxiii, pipeline runs FR lxv, model registry FR lxii).
Monetary columns use Float at rest; analytics MUST round via Decimal helpers
in src/common/money.py. Run `python -m src.common.models --dump-ddl` to
regenerate database/schema.sql.
"""
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import (Boolean, Column, Date, DateTime, Float, ForeignKey, Integer,
                        String, Text, UniqueConstraint, create_engine)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Restaurant(Base):
    __tablename__ = "restaurants"
    restaurant_id = Column(String(16), primary_key=True)
    restaurant_name = Column(String(128), nullable=False)
    city = Column(String(64), nullable=False)
    region = Column(String(64))
    restaurant_type = Column(String(32))
    opening_date = Column(Date)
    performance_tier = Column(String(16))  # generator ground-truth tag, nullable


class MenuCategory(Base):
    __tablename__ = "menu_categories"
    category_id = Column(String(16), primary_key=True)
    category_name = Column(String(64), nullable=False, unique=True)


class MenuItem(Base):
    __tablename__ = "menu_items"
    item_id = Column(String(16), primary_key=True)
    item_name = Column(String(128), nullable=False)
    category_id = Column(String(16), ForeignKey("menu_categories.category_id"))
    base_cost = Column(Float)
    base_price = Column(Float)
    is_active = Column(Boolean, default=True)
    introduced_date = Column(Date)
    demand_tier = Column(String(16))
    wastage_tag = Column(String(16))
    price_sensitivity_tag = Column(String(16))
    seasonal_tag = Column(Boolean)
    promo_dependent_tag = Column(Boolean)
    category = relationship("MenuCategory")


class PricingHistory(Base):
    __tablename__ = "pricing_history"
    price_id = Column(String(16), primary_key=True)
    item_id = Column(String(16), ForeignKey("menu_items.item_id"), nullable=False, index=True)
    price = Column(Float)
    effective_from = Column(Date)
    effective_to = Column(Date)


class Customer(Base):
    __tablename__ = "customers"
    customer_id = Column(String(16), primary_key=True)
    home_city = Column(String(64))
    signup_date = Column(Date)
    preferred_channel = Column(String(32))
    true_segment = Column(String(32))  # generator ground-truth tag, nullable


class Promotion(Base):
    __tablename__ = "promotions"
    promotion_id = Column(String(16), primary_key=True)
    promotion_name = Column(String(128), nullable=False)
    scope = Column(String(16))  # Item | Category | Storewide
    target_id = Column(String(16))
    discount_pct = Column(Float)
    start_date = Column(Date)
    end_date = Column(Date)
    channel = Column(String(32))
    is_trap_flag = Column(Boolean)  # generator ground-truth tag, nullable


class Order(Base):
    __tablename__ = "orders"
    row_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(16), nullable=False, index=True)
    customer_id = Column(String(16), ForeignKey("customers.customer_id"), index=True)
    restaurant_id = Column(String(16), ForeignKey("restaurants.restaurant_id"), index=True)
    order_datetime = Column(DateTime, index=True)
    channel = Column(String(32))
    promotion_id = Column(String(16), ForeignKey("promotions.promotion_id"))
    status = Column(String(16))  # Completed | Cancelled
    total_amount = Column(Float)
    __table_args__ = (UniqueConstraint("order_id", "row_id"),)


class OrderItem(Base):
    __tablename__ = "order_items"
    order_item_id = Column(String(16), primary_key=True)
    order_id = Column(String(16), nullable=False, index=True)
    item_id = Column(String(16), ForeignKey("menu_items.item_id"), index=True)
    quantity = Column(Integer)
    unit_price = Column(Float)
    discount_pct = Column(Float)
    promotion_id = Column(String(16), ForeignKey("promotions.promotion_id"))
    line_total = Column(Float)


class Rating(Base):
    __tablename__ = "ratings"
    rating_id = Column(String(16), primary_key=True)
    customer_id = Column(String(16), ForeignKey("customers.customer_id"), index=True)
    item_id = Column(String(16), ForeignKey("menu_items.item_id"), index=True)
    restaurant_id = Column(String(16), ForeignKey("restaurants.restaurant_id"))
    order_id = Column(String(16))
    rating = Column(Integer)
    review_date = Column(Date)


class Inventory(Base):
    __tablename__ = "inventory"
    inventory_id = Column(String(16), primary_key=True)
    restaurant_id = Column(String(16), ForeignKey("restaurants.restaurant_id"), index=True)
    item_id = Column(String(16), ForeignKey("menu_items.item_id"), index=True)
    date = Column(Date, index=True)
    stock_level = Column(Integer)
    consumed_qty = Column(Integer)
    replenished_qty = Column(Integer)


class Wastage(Base):
    __tablename__ = "wastage"
    wastage_id = Column(String(16), primary_key=True)
    restaurant_id = Column(String(16), ForeignKey("restaurants.restaurant_id"), index=True)
    item_id = Column(String(16), ForeignKey("menu_items.item_id"), index=True)
    date = Column(Date, index=True)
    wasted_qty = Column(Float)
    wastage_cost = Column(Float)
    reason = Column(String(32))


# -- Application tables (FR i–ii, lxii–lxiii, lxv) ------------------------------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), nullable=False, unique=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(16), nullable=False, default="viewer")  # admin|manager|analyst|viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, default=datetime.utcnow, index=True)
    username = Column(String(64))
    action = Column(String(64), nullable=False)
    detail = Column(Text)


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    pipeline = Column(String(32), nullable=False)  # spark | python
    stage = Column(String(64), nullable=False)
    status = Column(String(16), nullable=False)  # started|success|failed
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime)
    records_in = Column(Integer)
    records_out = Column(Integer)
    message = Column(Text)


class ModelRegistry(Base):
    __tablename__ = "model_registry"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)
    version = Column(String(16), nullable=False)
    pipeline = Column(String(16), nullable=False)  # spark | python
    task = Column(String(64), nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow)
    train_range = Column(String(64))
    params = Column(Text)
    metrics = Column(Text)
    artifact_path = Column(String(256))


def dump_ddl() -> str:
    from sqlalchemy.schema import CreateTable
    eng = create_engine("sqlite://")
    return "\n\n".join(str(CreateTable(t).compile(eng)).strip() + ";"
                        for t in Base.metadata.sorted_tables)


if __name__ == "__main__":
    if "--dump-ddl" in sys.argv:
        out = Path(__file__).resolve().parent.parent.parent / "database" / "schema.sql"
        out.write_text("-- DineIQ Analytics SQLite DDL (generated from src/common/models.py)\n\n"
                       + dump_ddl() + "\n")
        print(f"DDL -> {out}")
