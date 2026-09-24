"""
DineIQ Analytics - Restaurant Dataset Generator
=================================================
Generates a realistic, interconnected, multi-table restaurant dataset for the
DineIQ Analytics project (Aptech TechWiz7 - Data Science Intelligence Arena).

Tables generated:
    1. Restaurants
    2. Menu_Categories
    3. Menu_Items
    4. Pricing_History
    5. Customers
    6. Promotions
    7. Orders
    8. Order_Items
    9. Ratings
    10. Inventory
    11. Wastage

Design notes
------------
- No external services or internet access are required. Names are built from
  curated local lists instead of a library like Faker, so this script runs
  anywhere with just pandas + numpy (and optionally pyarrow for Parquet).
- Customers are anonymized by design (customer_id only, no personal names),
  matching the SRS requirement for anonymized customer profiles.
- The generator deliberately seeds "tricky" business cases required by the
  SRS: high-selling loss-making dishes, highly-profitable-but-rarely-ordered
  dishes, high-wastage popular dishes, promotion traps, price-sensitive
  items, seasonal items, and customers with churn / high-value / new
  behavior patterns.
- Two scales are provided:
    DEMO_MODE = True   -> small, fast dataset for development & testing
    DEMO_MODE = False  -> sized to meet the SRS minimum dataset requirements
                          (this will take longer and use more disk space)

Usage
-----
    python generate_dataset.py

Output is written to ./output/ as CSV files, plus one Parquet file
(fact_order_items.parquet) to demonstrate Big Data storage.
"""

import os
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# =====================================================================
# CONFIGURATION
# =====================================================================

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# Flip this to False when you are ready to generate the full
# competition-scale dataset (takes longer, produces much larger files).
DEMO_MODE = True

if DEMO_MODE:
    NUM_CUSTOMERS = 4000
    NUM_ORDERS = 9000
    AVG_BASKET_SIZE = 2.6          # avg items per order
    NUM_RATINGS_TARGET = 6000
    INVENTORY_DAYS_SAMPLE = 90      # inventory snapshots per restaurant/item
    WASTAGE_RECORDS_TARGET = 4000
else:
    NUM_CUSTOMERS = 50000
    NUM_ORDERS = 100000
    AVG_BASKET_SIZE = 10.0          # tuned so order-line count clears 1,000,000
    NUM_RATINGS_TARGET = 100000
    INVENTORY_DAYS_SAMPLE = 365
    WASTAGE_RECORDS_TARGET = 50000

NUM_RESTAURANTS = 20
NUM_MONTHS = 14  # a bit over a year so we always have >=12 full months of history
START_DATE = datetime.today() - timedelta(days=NUM_MONTHS * 30)
END_DATE = datetime.today()

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Data-quality "dirtiness" rates (used later to deliberately inject problems)
MISSING_RATE = 0.015
DUPLICATE_RATE = 0.01
INVALID_RATE = 0.008

# =====================================================================
# REFERENCE / LOOKUP DATA
# =====================================================================

CITIES = [
    "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Hyderabad", "Sialkot",
]

CHANNELS = ["Dine-in", "Takeaway", "Website/App", "Third-Party Delivery"]
CHANNEL_WEIGHTS = [0.40, 0.22, 0.20, 0.18]

CATEGORY_DISH_MAP = {
    "Appetizers": ["Spring Rolls", "Chicken Wings", "Loaded Nachos", "Garlic Bread",
                   "Bruschetta", "Mozzarella Sticks", "Onion Rings", "Hummus Platter",
                   "Spinach Dip", "Fried Calamari", "Chicken Samosas", "Potato Skins"],
    "Soups": ["Chicken Corn Soup", "Hot & Sour Soup", "Tomato Basil Soup",
              "Cream of Mushroom Soup", "Lentil Soup", "Seafood Chowder", "Chicken Broth"],
    "Salads": ["Caesar Salad", "Greek Salad", "Quinoa Bowl", "Garden Salad",
               "Beetroot Salad", "Fattoush", "Grilled Chicken Salad", "Stuffed Bell Peppers"],
    "Main Course": ["Grilled Salmon", "Beef Steak", "Chicken Karahi", "Lamb Chops",
                    "Butter Chicken", "Fish & Chips", "Roast Chicken", "BBQ Platter",
                    "Chicken Tikka", "Mutton Biryani", "Grilled Chicken Breast", "Beef Stroganoff"],
    "Pasta & Risotto": ["Truffle Pasta", "Spaghetti Bolognese", "Fettuccine Alfredo",
                        "Penne Arrabiata", "Creamy Risotto", "Mushroom Ravioli",
                        "Pesto Pasta", "Wild Mushroom Risotto", "Seafood Linguine"],
    "Pizza": ["Margherita Pizza", "Pepperoni Pizza", "BBQ Chicken Pizza",
              "Veggie Supreme Pizza", "Four Cheese Pizza", "Hawaiian Pizza", "Paneer Tikka Pizza"],
    "Burgers": ["Beef Burger", "Chicken Burger", "Zinger Burger", "Cheese Burger",
                "Veggie Burger", "Smoky BBQ Burger", "Double Patty Burger"],
    "Desserts": ["Chocolate Lava Cake", "Cheesecake", "Tiramisu", "Ice Cream Sundae",
                 "Baklava", "Chocolate Brownie", "Creme Caramel", "Fruit Tart"],
    "Beverages": ["Lemonade", "Iced Tea", "Cold Coffee", "Fresh Orange Juice",
                  "Chocolate Milkshake", "Soft Drink", "Mineral Water", "Mint Margarita (Mocktail)"],
    "Sides": ["French Fries", "Garlic Naan", "Coleslaw", "Mashed Potatoes",
              "Steamed Rice", "Grilled Vegetables", "Sauteed Spinach"],
    "Seafood": ["Grilled Shrimp", "Fish Tikka", "Prawn Masala", "Butter Garlic Prawns",
                "Grilled Fish Fillet", "Seafood Platter"],
}

WASTAGE_REASONS = ["Overproduction", "Spoilage", "Preparation Waste", "Customer Return",
                    "Expired Ingredients", "Quality Rejection"]

PROMO_NAMES = [
    "Weekend Feast Deal", "Buy 1 Get 1 Burger", "Ramadan Iftar Special",
    "Summer Cooler Combo", "Family Bundle Offer", "Lunch Hour Discount",
    "App-Only Flash Sale", "Loyalty Member Discount", "New Year Mega Deal",
    "Mid-Week Pizza Deal", "Delivery Free Shipping Week", "Student Discount Days",
]

# =====================================================================
# 1. RESTAURANTS
# =====================================================================

def generate_restaurants(n=NUM_RESTAURANTS):
    rows = []
    for i in range(1, n + 1):
        city = CITIES[(i - 1) % len(CITIES)]
        # give each location a "performance tier" that will quietly influence
        # sales/ratings/wastage later, to create realistic location differences
        tier = np.random.choice(["High", "Average", "Low"], p=[0.25, 0.55, 0.20])
        opened = START_DATE - timedelta(days=random.randint(200, 2500))
        rows.append({
            "restaurant_id": f"R{i:03d}",
            "restaurant_name": f"DineIQ {city} - Branch {i:02d}",
            "city": city,
            "region": city,  # kept simple; could be mapped to province if desired
            "restaurant_type": np.random.choice(["Fine Dining", "Casual Dining", "Fast Casual", "Cloud Kitchen"],
                                                 p=[0.15, 0.45, 0.30, 0.10]),
            "opening_date": opened.strftime("%Y-%m-%d"),
            "performance_tier": tier,  # not shown to trainees directly; used as hidden ground truth
        })
    return pd.DataFrame(rows)


# =====================================================================
# 2 & 3. MENU CATEGORIES + MENU ITEMS
# =====================================================================

def generate_menu_categories():
    rows = []
    for i, cat in enumerate(CATEGORY_DISH_MAP.keys(), start=1):
        rows.append({"category_id": f"C{i:02d}", "category_name": cat})
    return pd.DataFrame(rows)


MENU_VARIANT_PREFIXES = ["Spicy", "Classic", "Family-Size", "Chef's Special", "Grilled-Style"]
MIN_TOTAL_MENU_ITEMS = 155  # keep comfortably above the SRS minimum of 150


def _expand_dishes_with_variants(dishes, needed_extra):
    """Pad a category's dish list with realistic-sounding variants
    (e.g. 'Spicy Beef Burger') until `needed_extra` new names are produced,
    without ever repeating a name."""
    extra = []
    seen = set(dishes)
    i = 0
    while len(extra) < needed_extra:
        prefix = MENU_VARIANT_PREFIXES[i % len(MENU_VARIANT_PREFIXES)]
        base_dish = dishes[i % len(dishes)]
        candidate = f"{prefix} {base_dish}"
        if candidate not in seen:
            extra.append(candidate)
            seen.add(candidate)
        i += 1
    return extra


def generate_menu_items(categories_df):
    rows = []
    item_counter = 1
    cat_lookup = dict(zip(categories_df["category_name"], categories_df["category_id"]))

    # Figure out how many extra variant dishes each category needs so the
    # overall menu comfortably clears the SRS minimum of 150 items.
    base_total = sum(len(d) for d in CATEGORY_DISH_MAP.values())
    shortfall = max(0, MIN_TOTAL_MENU_ITEMS - base_total)
    per_category_extra = -(-shortfall // len(CATEGORY_DISH_MAP))  # ceil division

    for cat_name, dishes in CATEGORY_DISH_MAP.items():
        cat_id = cat_lookup[cat_name]
        full_dish_list = list(dishes) + _expand_dishes_with_variants(dishes, per_category_extra)
        for dish in full_dish_list:
            base_cost = round(np.random.uniform(2.5, 14.0), 2)
            # margin varies a lot on purpose -> needed for menu classification later
            margin_pct = np.random.uniform(0.15, 0.75)
            base_price = round(base_cost / (1 - margin_pct), 2)

            item_id = f"M{item_counter:04d}"
            rows.append({
                "item_id": item_id,
                "item_name": dish,
                "category_id": cat_id,
                "base_cost": base_cost,
                "base_price": base_price,
                "is_active": True,
                "introduced_date": (START_DATE - timedelta(days=random.randint(0, 1800))).strftime("%Y-%m-%d"),
                # hidden behavioral tags used to seed realistic + tricky patterns
                "demand_tier": np.random.choice(["High", "Medium", "Low"], p=[0.25, 0.45, 0.30]),
                "wastage_tag": np.random.choice(["High", "Normal"], p=[0.15, 0.85]),
                "price_sensitivity_tag": np.random.choice(["High", "Medium", "Low"], p=[0.2, 0.4, 0.4]),
                "seasonal_tag": np.random.choice([True, False], p=[0.12, 0.88]),
                "promo_dependent_tag": np.random.choice([True, False], p=[0.15, 0.85]),
            })
            item_counter += 1

    # Add a few new items with very little history (SRS "new item, insufficient history")
    for extra in ["Truffle Beef Sliders", "Charcoal Grilled Prawns", "Matcha Cheesecake"]:
        cat_id = np.random.choice(categories_df["category_id"])
        base_cost = round(np.random.uniform(3.0, 10.0), 2)
        base_price = round(base_cost * np.random.uniform(1.3, 2.2), 2)
        rows.append({
            "item_id": f"M{item_counter:04d}",
            "item_name": extra,
            "category_id": cat_id,
            "base_cost": base_cost,
            "base_price": base_price,
            "is_active": True,
            "introduced_date": (END_DATE - timedelta(days=random.randint(3, 20))).strftime("%Y-%m-%d"),
            "demand_tier": "Low",
            "wastage_tag": "Normal",
            "price_sensitivity_tag": "Medium",
            "seasonal_tag": False,
            "promo_dependent_tag": False,
        })
        item_counter += 1

    return pd.DataFrame(rows)


# =====================================================================
# 4. PRICING HISTORY
# =====================================================================

def generate_pricing_history(menu_items_df):
    rows = []
    price_id = 1
    for _, item in menu_items_df.iterrows():
        current_price = item["base_price"]
        effective_from = item["introduced_date"]
        num_changes = np.random.choice([0, 1, 2, 3], p=[0.35, 0.35, 0.20, 0.10])

        change_dates = sorted([
            (START_DATE + timedelta(days=random.randint(0, (END_DATE - START_DATE).days)))
            for _ in range(num_changes)
        ])

        prev_date = effective_from
        price = current_price
        for cd in change_dates:
            rows.append({
                "price_id": f"P{price_id:06d}",
                "item_id": item["item_id"],
                "price": round(price, 2),
                "effective_from": prev_date if isinstance(prev_date, str) else prev_date.strftime("%Y-%m-%d"),
                "effective_to": cd.strftime("%Y-%m-%d"),
            })
            price_id += 1
            # price sensitive items get bigger swings on purpose
            swing = np.random.uniform(0.05, 0.25) if item["price_sensitivity_tag"] == "High" else np.random.uniform(0.02, 0.10)
            direction = np.random.choice([1, -1])
            price = max(1.0, round(price * (1 + direction * swing), 2))
            prev_date = cd

        rows.append({
            "price_id": f"P{price_id:06d}",
            "item_id": item["item_id"],
            "price": round(price, 2),
            "effective_from": prev_date if isinstance(prev_date, str) else prev_date.strftime("%Y-%m-%d"),
            "effective_to": None,  # current active price
        })
        price_id += 1

    return pd.DataFrame(rows)


# =====================================================================
# 5. CUSTOMERS
# =====================================================================

def generate_customers(n=NUM_CUSTOMERS):
    rows = []
    # hidden "true segment" used to drive realistic ordering behavior later
    segment_choices = ["High-Value Loyal", "Frequent", "Promotion-Driven",
                        "At-Risk", "New", "Occasional"]
    segment_weights = [0.10, 0.18, 0.15, 0.15, 0.17, 0.25]

    for i in range(1, n + 1):
        signup_date = START_DATE + timedelta(days=random.randint(0, (END_DATE - START_DATE).days))
        segment = np.random.choice(segment_choices, p=segment_weights)
        # 'New' customers must have signed up recently
        if segment == "New":
            signup_date = END_DATE - timedelta(days=random.randint(1, 30))

        rows.append({
            "customer_id": f"CUST{i:06d}",
            "home_city": np.random.choice(CITIES),
            "signup_date": signup_date.strftime("%Y-%m-%d"),
            "preferred_channel": np.random.choice(CHANNELS, p=CHANNEL_WEIGHTS),
            "true_segment": segment,  # hidden ground truth for validating segmentation models
        })
    return pd.DataFrame(rows)


# =====================================================================
# 6. PROMOTIONS
# =====================================================================

def generate_promotions(menu_items_df, categories_df):
    rows = []
    for i, name in enumerate(PROMO_NAMES, start=1):
        start = START_DATE + timedelta(days=random.randint(0, (END_DATE - START_DATE).days - 30))
        duration = random.randint(5, 21)
        end = start + timedelta(days=duration)

        # some promotions are deliberately "traps": heavy discount driving volume
        # but destroying margin (needed for Promotion Trap Detection)
        is_trap = np.random.choice([True, False], p=[0.3, 0.7])
        discount_pct = round(np.random.uniform(0.25, 0.45), 2) if is_trap else round(np.random.uniform(0.08, 0.20), 2)

        scope = np.random.choice(["Category", "Item", "Storewide"], p=[0.4, 0.35, 0.25])
        if scope == "Category":
            target = np.random.choice(categories_df["category_id"])
        elif scope == "Item":
            target = np.random.choice(menu_items_df["item_id"])
        else:
            target = "ALL"

        rows.append({
            "promotion_id": f"PROMO{i:03d}",
            "promotion_name": name,
            "scope": scope,
            "target_id": target,
            "discount_pct": discount_pct,
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": end.strftime("%Y-%m-%d"),
            "channel": np.random.choice(CHANNELS + ["All Channels"]),
            "is_trap_flag": is_trap,  # hidden helper for validation, not a real-world field
        })
    return pd.DataFrame(rows)


# =====================================================================
# HELPER: build a lookup of active promotions per date (used by orders)
# =====================================================================

def build_promo_index(promotions_df):
    promo_index = []
    for _, p in promotions_df.iterrows():
        promo_index.append({
            "promotion_id": p["promotion_id"],
            "scope": p["scope"],
            "target_id": p["target_id"],
            "discount_pct": p["discount_pct"],
            "start": datetime.strptime(p["start_date"], "%Y-%m-%d"),
            "end": datetime.strptime(p["end_date"], "%Y-%m-%d"),
        })
    return promo_index


def active_promotions_on(date, promo_index):
    return [p for p in promo_index if p["start"] <= date <= p["end"]]


# =====================================================================
# 7 & 8. ORDERS + ORDER ITEMS
# =====================================================================

# Item pairs that should co-occur more often, to give market-basket analysis
# something meaningful to discover. Filled in once menu items are known.
def build_affinity_pairs(menu_items_df):
    name_to_id = dict(zip(menu_items_df["item_name"], menu_items_df["item_id"]))
    candidate_pairs = [
        ("Beef Burger", "French Fries"), ("Chicken Burger", "French Fries"),
        ("Margherita Pizza", "Soft Drink"), ("Zinger Burger", "Coleslaw"),
        ("BBQ Chicken Pizza", "Iced Tea"), ("Truffle Pasta", "Garlic Bread"),
        ("Mutton Biryani", "Lemonade"), ("Grilled Salmon", "Grilled Vegetables"),
        ("Chocolate Lava Cake", "Cold Coffee"), ("Fish & Chips", "Coleslaw"),
    ]
    pairs = []
    for a, b in candidate_pairs:
        if a in name_to_id and b in name_to_id:
            pairs.append((name_to_id[a], name_to_id[b]))
    return pairs


def peak_hour_for(dt):
    """Return an hour (0-23) biased toward lunch (12-14) and dinner (19-21.5) peaks."""
    r = random.random()
    if r < 0.35:
        return random.randint(11, 14)
    elif r < 0.75:
        return random.randint(18, 22)
    else:
        return random.randint(8, 23)


def generate_orders_and_items(customers_df, restaurants_df, menu_items_df, promotions_df):
    promo_index = build_promo_index(promotions_df)
    affinity_pairs = build_affinity_pairs(menu_items_df)
    item_ids = menu_items_df["item_id"].tolist()
    item_price_lookup = dict(zip(menu_items_df["item_id"], menu_items_df["base_price"]))
    item_demand_tier = dict(zip(menu_items_df["item_id"], menu_items_df["demand_tier"]))

    demand_weight = {"High": 3.0, "Medium": 1.5, "Low": 0.5}
    item_weights = np.array([demand_weight[item_demand_tier[i]] for i in item_ids])
    item_weights = item_weights / item_weights.sum()

    segment_order_multiplier = {
        "High-Value Loyal": 3.5, "Frequent": 2.5, "Promotion-Driven": 2.0,
        "At-Risk": 1.0, "New": 0.6, "Occasional": 1.0,
    }

    orders_rows = []
    order_items_rows = []
    order_counter = 1
    order_item_counter = 1

    total_days = (END_DATE - START_DATE).days
    customer_records = customers_df.to_dict("records")
    restaurant_ids = restaurants_df["restaurant_id"].tolist()
    restaurant_city = dict(zip(restaurants_df["restaurant_id"], restaurants_df["city"]))
    customer_home_restaurants = {}
    for r_id in restaurant_ids:
        customer_home_restaurants.setdefault(restaurant_city[r_id], []).append(r_id)

    # Build a weighted sampling pool of customers so higher-value segments order more often
    weights = np.array([segment_order_multiplier[c["true_segment"]] for c in customer_records])
    weights = weights / weights.sum()

    n_orders = NUM_ORDERS
    chosen_customers_idx = np.random.choice(len(customer_records), size=n_orders, replace=True, p=weights)

    for idx in chosen_customers_idx:
        cust = customer_records[idx]
        signup = datetime.strptime(cust["signup_date"], "%Y-%m-%d")

        # order date must be after signup
        min_offset = max(0, (signup - START_DATE).days)
        day_offset = random.randint(min_offset, total_days)
        order_date = START_DATE + timedelta(days=day_offset)

        # weekend boost
        if order_date.weekday() in (4, 5) and random.random() < 0.3:
            pass  # already weighted implicitly by random sampling; kept simple

        hour = peak_hour_for(order_date)
        order_dt = order_date.replace(hour=hour, minute=random.randint(0, 59))

        # pick restaurant: mostly home city, sometimes cross-city
        home_city = cust["home_city"]
        if random.random() < 0.85 and home_city in customer_home_restaurants:
            restaurant_id = np.random.choice(customer_home_restaurants[home_city])
        else:
            restaurant_id = np.random.choice(restaurant_ids)

        channel = np.random.choice(CHANNELS, p=CHANNEL_WEIGHTS)

        # find active promotions "storewide" or matching channel
        active_promos = active_promotions_on(order_dt, promo_index)
        promo_applied = None
        if active_promos and (cust["true_segment"] == "Promotion-Driven" or random.random() < 0.25):
            promo_applied = random.choice(active_promos)

        # cancelled orders (small %)
        status = "Cancelled" if random.random() < 0.03 else "Completed"

        order_id = f"ORD{order_counter:07d}"

        # ---- basket construction ----
        basket_size = max(1, int(np.random.poisson(AVG_BASKET_SIZE)))
        basket_items = list(np.random.choice(item_ids, size=basket_size, p=item_weights, replace=True))

        # occasionally force an affinity pair to strengthen market-basket signal
        if affinity_pairs and random.random() < 0.35:
            a, b = random.choice(affinity_pairs)
            basket_items[0] = a
            if len(basket_items) > 1:
                basket_items[1] = b
            else:
                basket_items.append(b)

        order_total = 0.0
        for item_id in basket_items:
            qty = np.random.choice([1, 2, 3], p=[0.7, 0.22, 0.08])
            unit_price = item_price_lookup[item_id]

            discount_pct = 0.0
            applied_promo_id = None
            if promo_applied is not None:
                scope, target = promo_applied["scope"], promo_applied["target_id"]
                item_cat = menu_items_df.loc[menu_items_df["item_id"] == item_id, "category_id"].values[0]
                if scope == "Storewide" or (scope == "Item" and target == item_id) or (scope == "Category" and target == item_cat):
                    discount_pct = promo_applied["discount_pct"]
                    applied_promo_id = promo_applied["promotion_id"]

            line_total = round(qty * unit_price * (1 - discount_pct), 2)
            order_total += line_total

            order_items_rows.append({
                "order_item_id": f"OI{order_item_counter:08d}",
                "order_id": order_id,
                "item_id": item_id,
                "quantity": int(qty),
                "unit_price": round(unit_price, 2),
                "discount_pct": discount_pct,
                "promotion_id": applied_promo_id,
                "line_total": line_total,
            })
            order_item_counter += 1

        orders_rows.append({
            "order_id": order_id,
            "customer_id": cust["customer_id"],
            "restaurant_id": restaurant_id,
            "order_datetime": order_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "channel": channel,
            "promotion_id": promo_applied["promotion_id"] if promo_applied else None,
            "status": status,
            "total_amount": round(order_total, 2),
        })
        order_counter += 1

    return pd.DataFrame(orders_rows), pd.DataFrame(order_items_rows)


# =====================================================================
# 9. RATINGS
# =====================================================================

def generate_ratings(orders_df, order_items_df, menu_items_df, restaurants_df, target=NUM_RATINGS_TARGET):
    completed = orders_df[orders_df["status"] == "Completed"]
    merged = order_items_df.merge(completed[["order_id", "customer_id", "restaurant_id", "order_datetime"]],
                                   on="order_id", how="inner")
    if len(merged) == 0:
        return pd.DataFrame()

    sample_n = min(target, len(merged))
    sample = merged.sample(n=sample_n, random_state=SEED)

    item_quality_base = {}
    for _, item in menu_items_df.iterrows():
        # tie a hidden quality baseline to demand tier and wastage (poor items rate lower)
        base = 4.3 if item["demand_tier"] == "High" else 3.9 if item["demand_tier"] == "Medium" else 3.4
        if item["wastage_tag"] == "High":
            base -= 0.3
        item_quality_base[item["item_id"]] = base

    rows = []
    for i, (_, r) in enumerate(sample.iterrows(), start=1):
        base_rating = item_quality_base.get(r["item_id"], 3.8)
        rating_val = np.clip(np.random.normal(base_rating, 0.6), 1, 5)

        review_date = datetime.strptime(r["order_datetime"], "%Y-%m-%d %H:%M:%S") + timedelta(days=random.randint(0, 5))

        rows.append({
            "rating_id": f"RATE{i:07d}",
            "customer_id": r["customer_id"],
            "item_id": r["item_id"],
            "restaurant_id": r["restaurant_id"],
            "order_id": r["order_id"],
            "rating": round(rating_val),
            "review_date": review_date.strftime("%Y-%m-%d"),
        })

    ratings_df = pd.DataFrame(rows)

    # inject a rating anomaly: a burst of identical 5-star ratings for one item
    # in a short window (SRS: rating anomaly detection test case)
    if len(menu_items_df) > 0:
        anomaly_item = menu_items_df.sample(1, random_state=SEED)["item_id"].values[0]
        anomaly_date = END_DATE - timedelta(days=10)
        burst_rows = []
        for j in range(30):
            burst_rows.append({
                "rating_id": f"RATE-ANOM{j:03d}",
                "customer_id": np.random.choice(sample["customer_id"].unique()),
                "item_id": anomaly_item,
                "restaurant_id": np.random.choice(restaurants_df["restaurant_id"]),
                "order_id": None,
                "rating": 5,
                "review_date": (anomaly_date + timedelta(hours=j)).strftime("%Y-%m-%d"),
            })
        ratings_df = pd.concat([ratings_df, pd.DataFrame(burst_rows)], ignore_index=True)

    return ratings_df


# =====================================================================
# 10. INVENTORY
# =====================================================================

def generate_inventory(restaurants_df, menu_items_df, days_sample=INVENTORY_DAYS_SAMPLE):
    rows = []
    inv_id = 1
    all_dates = pd.date_range(START_DATE, END_DATE, freq="D")
    sampled_dates = np.random.choice(all_dates, size=min(days_sample, len(all_dates)), replace=False)

    for r_id in restaurants_df["restaurant_id"]:
        # sample a subset of items per restaurant per day for manageable volume
        items_sample = menu_items_df.sample(frac=0.5, random_state=SEED)
        for d in sampled_dates:
            d_ts = pd.Timestamp(d)
            for _, item in items_sample.iterrows():
                base_stock = np.random.randint(20, 200)
                consumed = np.random.randint(0, base_stock)
                replenished = np.random.randint(0, 100)
                rows.append({
                    "inventory_id": f"INV{inv_id:08d}",
                    "restaurant_id": r_id,
                    "item_id": item["item_id"],
                    "date": d_ts.strftime("%Y-%m-%d"),
                    "stock_level": base_stock,
                    "consumed_qty": consumed,
                    "replenished_qty": replenished,
                })
                inv_id += 1
    return pd.DataFrame(rows)


# =====================================================================
# 11. WASTAGE
# =====================================================================

def generate_wastage(restaurants_df, menu_items_df, target=WASTAGE_RECORDS_TARGET):
    rows = []
    high_wastage_items = menu_items_df[menu_items_df["wastage_tag"] == "High"]["item_id"].tolist()
    normal_items = menu_items_df[menu_items_df["wastage_tag"] == "Normal"]["item_id"].tolist()

    for i in range(1, target + 1):
        # 60% of wastage volume concentrated in "high wastage" items on purpose
        if high_wastage_items and random.random() < 0.6:
            item_id = random.choice(high_wastage_items)
            wasted_qty = round(np.random.uniform(3, 15), 1)
        else:
            item_id = random.choice(normal_items) if normal_items else random.choice(menu_items_df["item_id"].tolist())
            wasted_qty = round(np.random.uniform(0.5, 5), 1)

        item_cost = menu_items_df.loc[menu_items_df["item_id"] == item_id, "base_cost"].values[0]
        d = START_DATE + timedelta(days=random.randint(0, (END_DATE - START_DATE).days))

        rows.append({
            "wastage_id": f"WST{i:07d}",
            "restaurant_id": np.random.choice(restaurants_df["restaurant_id"]),
            "item_id": item_id,
            "date": d.strftime("%Y-%m-%d"),
            "wasted_qty": wasted_qty,
            "wastage_cost": round(wasted_qty * item_cost, 2),
            "reason": np.random.choice(WASTAGE_REASONS),
        })
    return pd.DataFrame(rows)


# =====================================================================
# DATA QUALITY: deliberately inject realistic problems
# =====================================================================

def inject_data_quality_issues(dfs):
    """Mutates a subset of rows in-place across tables to create realistic,
    documented data-quality problems: missing values, duplicates, invalid
    values. Returns a small report dict describing what was injected."""

    report = {}

    # --- Orders: negative/invalid amounts, missing customer id, duplicates ---
    orders = dfs["Orders"]
    n = len(orders)
    if n > 0:
        missing_idx = orders.sample(frac=MISSING_RATE, random_state=SEED).index
        orders.loc[missing_idx, "customer_id"] = None
        report["orders_missing_customer_id"] = len(missing_idx)

        invalid_idx = orders.sample(frac=INVALID_RATE, random_state=SEED + 1).index
        orders.loc[invalid_idx, "total_amount"] = -abs(orders.loc[invalid_idx, "total_amount"])
        report["orders_negative_amount"] = len(invalid_idx)

        dup_rows = orders.sample(frac=DUPLICATE_RATE, random_state=SEED + 2)
        dfs["Orders"] = pd.concat([orders, dup_rows], ignore_index=True)
        report["orders_duplicated_rows"] = len(dup_rows)

    # --- Order_Items: negative quantities, missing item_id ---
    oi = dfs["Order_Items"]
    if len(oi) > 0:
        neg_idx = oi.sample(frac=INVALID_RATE, random_state=SEED + 3).index
        oi.loc[neg_idx, "quantity"] = -oi.loc[neg_idx, "quantity"]
        report["order_items_negative_quantity"] = len(neg_idx)

        miss_idx = oi.sample(frac=MISSING_RATE, random_state=SEED + 4).index
        oi.loc[miss_idx, "item_id"] = None
        report["order_items_missing_item_id"] = len(miss_idx)

    # --- Menu_Items: a couple of invalid prices ---
    mi = dfs["Menu_Items"]
    if len(mi) > 0:
        bad_idx = mi.sample(n=max(1, int(len(mi) * 0.01)), random_state=SEED + 5).index
        mi.loc[bad_idx, "base_price"] = 0
        report["menu_items_invalid_price"] = len(bad_idx)

    # --- Ratings: invalid rating values ---
    rt = dfs["Ratings"]
    if len(rt) > 0:
        bad_idx = rt.sample(frac=INVALID_RATE, random_state=SEED + 6).index
        rt.loc[bad_idx, "rating"] = np.random.choice([0, 6, -1], size=len(bad_idx))
        report["ratings_invalid_value"] = len(bad_idx)

    # --- Customers: missing home_city ---
    cu = dfs["Customers"]
    if len(cu) > 0:
        miss_idx = cu.sample(frac=MISSING_RATE, random_state=SEED + 7).index
        cu.loc[miss_idx, "home_city"] = None
        report["customers_missing_city"] = len(miss_idx)

    # --- Wastage: a few impossible (extreme) wastage quantities ---
    ws = dfs["Wastage"]
    if len(ws) > 0:
        extreme_idx = ws.sample(n=max(1, int(len(ws) * 0.005)), random_state=SEED + 8).index
        ws.loc[extreme_idx, "wasted_qty"] = ws.loc[extreme_idx, "wasted_qty"] * 50
        report["wastage_extreme_values"] = len(extreme_idx)

    return report


# =====================================================================
# SAVE + DOCUMENT
# =====================================================================

def save_all(dfs, outdir=OUTPUT_DIR):
    for name, df in dfs.items():
        path = os.path.join(outdir, f"{name}.csv")
        df.to_csv(path, index=False)
        print(f"  Saved {name:20s} -> {path}  ({len(df):,} rows)")

    # Parquet demonstration (requires pyarrow or fastparquet on the running machine)
    parquet_path = os.path.join(outdir, "fact_order_items.parquet")
    try:
        dfs["Order_Items"].to_parquet(parquet_path, index=False)
        print(f"  Saved Parquet         -> {parquet_path}")
    except Exception as e:
        print(f"  [!] Could not write Parquet file ({e}).")
        print("      Run: pip install pyarrow   (needs internet access) then re-run this script.")


def write_data_dictionary(dfs, outdir=OUTPUT_DIR):
    lines = ["# DineIQ Analytics - Data Dictionary\n"]
    for name, df in dfs.items():
        lines.append(f"## {name}  ({len(df):,} rows)\n")
        lines.append("| Column | Sample Value | Dtype |")
        lines.append("|---|---|---|")
        for col in df.columns:
            sample = df[col].dropna().iloc[0] if df[col].notna().any() else ""
            lines.append(f"| {col} | {sample} | {df[col].dtype} |")
        lines.append("")
    path = os.path.join(outdir, "DATA_DICTIONARY.md")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    print(f"  Saved Data Dictionary -> {path}")


def write_quality_report(report, outdir=OUTPUT_DIR):
    path = os.path.join(outdir, "DATA_QUALITY_INJECTED_REPORT.json")
    with open(path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"  Saved DQ Injection Report -> {path}")


# =====================================================================
# MAIN
# =====================================================================

def main():
    mode = "DEMO" if DEMO_MODE else "FULL (competition scale)"
    print(f"Generating DineIQ Analytics dataset — mode: {mode}")
    print(f"  Customers: {NUM_CUSTOMERS:,} | Orders: {NUM_ORDERS:,} | Restaurants: {NUM_RESTAURANTS}")
    print("-" * 70)

    restaurants_df = generate_restaurants()
    categories_df = generate_menu_categories()
    menu_items_df = generate_menu_items(categories_df)
    pricing_df = generate_pricing_history(menu_items_df)
    customers_df = generate_customers()
    promotions_df = generate_promotions(menu_items_df, categories_df)

    print("Generating orders and order items (this is the slow step)...")
    orders_df, order_items_df = generate_orders_and_items(customers_df, restaurants_df, menu_items_df, promotions_df)

    print("Generating ratings...")
    ratings_df = generate_ratings(orders_df, order_items_df, menu_items_df, restaurants_df)

    print("Generating inventory...")
    inventory_df = generate_inventory(restaurants_df, menu_items_df)

    print("Generating wastage...")
    wastage_df = generate_wastage(restaurants_df, menu_items_df)

    dfs = {
        "Restaurants": restaurants_df,
        "Menu_Categories": categories_df,
        "Menu_Items": menu_items_df,
        "Pricing_History": pricing_df,
        "Customers": customers_df,
        "Promotions": promotions_df,
        "Orders": orders_df,
        "Order_Items": order_items_df,
        "Ratings": ratings_df,
        "Inventory": inventory_df,
        "Wastage": wastage_df,
    }

    print("-" * 70)
    print("Injecting realistic data-quality problems...")
    dq_report = inject_data_quality_issues(dfs)

    print("-" * 70)
    print("Saving all tables to ./output/ ...")
    save_all(dfs)
    write_data_dictionary(dfs)
    write_quality_report(dq_report)

    print("-" * 70)
    print("DONE. Summary:")
    for name, df in dfs.items():
        print(f"  {name:20s}: {len(df):,} rows")
    print("\nInjected data-quality issues:")
    for k, v in dq_report.items():
        print(f"  {k}: {v}")

    if DEMO_MODE:
        print("\n[i] This is DEMO_MODE (small, fast dataset for development).")
        print("    Set DEMO_MODE = False at the top of this script and re-run")
        print("    to generate a dataset sized to the SRS minimum requirements.")


if __name__ == "__main__":
    main()
