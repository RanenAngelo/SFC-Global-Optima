"""Pydantic request/response contracts (user §42: typed API data contracts)."""
from typing import Any, Optional

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


class UserOut(BaseModel):
    username: str
    role: str
    is_active: bool


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    role: str = "viewer"


class OrderLineIn(BaseModel):
    item_id: str
    quantity: int = Field(gt=0, le=50)


class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    restaurant_id: str
    channel: str = "Website/App"
    promotion_id: Optional[str] = None
    lines: list[OrderLineIn]


class OrderStatusUpdate(BaseModel):
    status: str  # Completed | Cancelled


class MenuAvailability(BaseModel):
    is_active: bool


class MenuItemUpdate(BaseModel):
    is_active: Optional[bool] = None
    item_name: Optional[str] = None
    category_id: Optional[str] = None
    base_cost: Optional[float] = Field(default=None, ge=0)


class MenuItemCreate(BaseModel):
    item_name: str = Field(min_length=2, max_length=120)
    category_id: str
    base_cost: float = Field(ge=0)
    base_price: float = Field(gt=0)
    is_active: bool = True


class MenuPriceUpdate(BaseModel):
    new_price: float = Field(gt=0)


class PromotionCreate(BaseModel):
    promotion_id: str
    promotion_name: str
    scope: str
    target_id: str = "ALL"
    discount_pct: float = Field(ge=0, le=0.9)
    start_date: str
    end_date: str
    channel: str = "All Channels"


class RecStateUpdate(BaseModel):
    state: str  # saved | dismissed | done | new


class WhatIfIn(BaseModel):
    scenario: str  # price | discount | remove | prep_cut | demand
    item_id: str
    new_price: Optional[float] = None
    discount_pct: Optional[float] = None
    days: int = 14
    cut_pct: Optional[float] = None
    demand_pct: Optional[float] = None


class RefreshIn(BaseModel):
    spark: bool = False  # also re-run Spark stages (slow); default: Python only


class ApiList(BaseModel):
    rows: list[dict[str, Any]]
    total: int
    page: int
    page_size: int
