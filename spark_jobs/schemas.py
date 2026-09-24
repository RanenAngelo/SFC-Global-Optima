"""Explicit Spark schemas for all 11 SRS tables (SRS Step 3: explicit schema
definition + data-type validation). Used by ingest.py; inferred schemas are
additionally produced there to satisfy the schema-inference requirement.
"""
from pyspark.sql.types import (BooleanType, DateType, DoubleType, IntegerType,
                               StringType, StructField, StructType, TimestampType)

Restaurants = StructType([
    StructField("restaurant_id", StringType(), False),
    StructField("restaurant_name", StringType(), True),
    StructField("city", StringType(), True),
    StructField("region", StringType(), True),
    StructField("restaurant_type", StringType(), True),
    StructField("opening_date", DateType(), True),
    StructField("performance_tier", StringType(), True),
])

MenuCategories = StructType([
    StructField("category_id", StringType(), False),
    StructField("category_name", StringType(), True),
])

MenuItems = StructType([
    StructField("item_id", StringType(), False),
    StructField("item_name", StringType(), True),
    StructField("category_id", StringType(), True),
    StructField("base_cost", DoubleType(), True),
    StructField("base_price", DoubleType(), True),
    StructField("is_active", BooleanType(), True),
    StructField("introduced_date", DateType(), True),
    StructField("demand_tier", StringType(), True),
    StructField("wastage_tag", StringType(), True),
    StructField("price_sensitivity_tag", StringType(), True),
    StructField("seasonal_tag", BooleanType(), True),
    StructField("promo_dependent_tag", BooleanType(), True),
])

PricingHistory = StructType([
    StructField("price_id", StringType(), False),
    StructField("item_id", StringType(), True),
    StructField("price", DoubleType(), True),
    StructField("effective_from", DateType(), True),
    StructField("effective_to", DateType(), True),
])

Customers = StructType([
    StructField("customer_id", StringType(), False),
    StructField("home_city", StringType(), True),
    StructField("signup_date", DateType(), True),
    StructField("preferred_channel", StringType(), True),
    StructField("true_segment", StringType(), True),
])

Promotions = StructType([
    StructField("promotion_id", StringType(), False),
    StructField("promotion_name", StringType(), True),
    StructField("scope", StringType(), True),
    StructField("target_id", StringType(), True),
    StructField("discount_pct", DoubleType(), True),
    StructField("start_date", DateType(), True),
    StructField("end_date", DateType(), True),
    StructField("channel", StringType(), True),
    StructField("is_trap_flag", BooleanType(), True),
])

Orders = StructType([
    StructField("order_id", StringType(), False),
    StructField("customer_id", StringType(), True),
    StructField("restaurant_id", StringType(), True),
    StructField("order_datetime", TimestampType(), True),
    StructField("channel", StringType(), True),
    StructField("promotion_id", StringType(), True),
    StructField("status", StringType(), True),
    StructField("total_amount", DoubleType(), True),
])

OrderItems = StructType([
    StructField("order_item_id", StringType(), False),
    StructField("order_id", StringType(), True),
    StructField("item_id", StringType(), True),
    StructField("quantity", IntegerType(), True),
    StructField("unit_price", DoubleType(), True),
    StructField("discount_pct", DoubleType(), True),
    StructField("promotion_id", StringType(), True),
    StructField("line_total", DoubleType(), True),
])

Ratings = StructType([
    StructField("rating_id", StringType(), False),
    StructField("customer_id", StringType(), True),
    StructField("item_id", StringType(), True),
    StructField("restaurant_id", StringType(), True),
    StructField("order_id", StringType(), True),
    StructField("rating", IntegerType(), True),
    StructField("review_date", DateType(), True),
])

Inventory = StructType([
    StructField("inventory_id", StringType(), False),
    StructField("restaurant_id", StringType(), True),
    StructField("item_id", StringType(), True),
    StructField("date", DateType(), True),
    StructField("stock_level", IntegerType(), True),
    StructField("consumed_qty", IntegerType(), True),
    StructField("replenished_qty", IntegerType(), True),
])

Wastage = StructType([
    StructField("wastage_id", StringType(), False),
    StructField("restaurant_id", StringType(), True),
    StructField("item_id", StringType(), True),
    StructField("date", DateType(), True),
    StructField("wasted_qty", DoubleType(), True),
    StructField("wastage_cost", DoubleType(), True),
    StructField("reason", StringType(), True),
])

# Logical table -> (raw CSV file, explicit schema, primary key)
TABLES = {
    "restaurants": ("Restaurants.csv", Restaurants, "restaurant_id"),
    "menu_categories": ("Menu_Categories.csv", MenuCategories, "category_id"),
    "menu_items": ("Menu_Items.csv", MenuItems, "item_id"),
    "pricing_history": ("Pricing_History.csv", PricingHistory, "price_id"),
    "customers": ("Customers.csv", Customers, "customer_id"),
    "promotions": ("Promotions.csv", Promotions, "promotion_id"),
    "orders": ("Orders.csv", Orders, "order_id"),
    "order_items": ("Order_Items.csv", OrderItems, "order_item_id"),
    "ratings": ("Ratings.csv", Ratings, "rating_id"),
    "inventory": ("Inventory.csv", Inventory, "inventory_id"),
    "wastage": ("Wastage.csv", Wastage, "wastage_id"),
}

# FK graph for validation/label joins (child.col -> parent table)
FOREIGN_KEYS = {
    "menu_items.category_id": "menu_categories",
    "pricing_history.item_id": "menu_items",
    "orders.customer_id": "customers",
    "orders.restaurant_id": "restaurants",
    "orders.promotion_id": "promotions",
    "order_items.order_id": "orders",
    "order_items.item_id": "menu_items",
    "order_items.promotion_id": "promotions",
    "ratings.customer_id": "customers",
    "ratings.item_id": "menu_items",
    "ratings.restaurant_id": "restaurants",
    "ratings.order_id": "orders",
    "inventory.restaurant_id": "restaurants",
    "inventory.item_id": "menu_items",
    "wastage.restaurant_id": "restaurants",
    "wastage.item_id": "menu_items",
}
