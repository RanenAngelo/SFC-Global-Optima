# DineIQ Analytics - Data Dictionary

## Restaurants  (20 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| restaurant_id | R001 | str |
| restaurant_name | DineIQ Karachi - Branch 01 | str |
| city | Karachi | str |
| region | Karachi | str |
| restaurant_type | Cloud Kitchen | str |
| opening_date | 2023-10-14 | str |
| performance_tier | Average | str |

## Menu_Categories  (11 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| category_id | C01 | str |
| category_name | Appetizers | str |

## Menu_Items  (160 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| item_id | M0001 | str |
| item_name | Spring Rolls | str |
| category_id | C01 | str |
| base_cost | 3.9 | float64 |
| base_price | 7.05 | float64 |
| is_active | True | bool |
| introduced_date | 2023-03-25 | str |
| demand_tier | High | str |
| wastage_tag | Normal | str |
| price_sensitivity_tag | Medium | str |
| seasonal_tag | False | bool |
| promo_dependent_tag | False | bool |

## Pricing_History  (314 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| price_id | P000001 | str |
| item_id | M0001 | str |
| price | 7.05 | float64 |
| effective_from | 2023-03-25 | str |
| effective_to | 2025-12-28 | str |

## Customers  (4,000 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| customer_id | CUST000001 | str |
| home_city | Peshawar | str |
| signup_date | 2025-11-29 | str |
| preferred_channel | Dine-in | str |
| true_segment | Frequent | str |

## Promotions  (12 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| promotion_id | PROMO001 | str |
| promotion_name | Weekend Feast Deal | str |
| scope | Storewide | str |
| target_id | ALL | str |
| discount_pct | 0.2 | float64 |
| start_date | 2025-10-24 | str |
| end_date | 2025-11-11 | str |
| channel | Website/App | str |
| is_trap_flag | False | bool |

## Orders  (9,090 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| order_id | ORD0000001 | str |
| customer_id | CUST000070 | str |
| restaurant_id | R004 | str |
| order_datetime | 2026-07-17 10:21:04 | str |
| channel | Website/App | str |
| promotion_id | PROMO012 | str |
| status | Completed | str |
| total_amount | 116.98 | float64 |

## Order_Items  (24,950 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| order_item_id | OI00000001 | str |
| order_id | ORD0000001 | str |
| item_id | M0108 | str |
| quantity | 2 | int64 |
| unit_price | 17.67 | float64 |
| discount_pct | 0.0 | float64 |
| promotion_id | PROMO002 | str |
| line_total | 35.34 | float64 |

## Ratings  (6,030 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| rating_id | RATE0000001 | str |
| customer_id | CUST003680 | str |
| item_id | M0032 | str |
| restaurant_id | R015 | str |
| order_id | ORD0001916 | object |
| rating | 4 | int64 |
| review_date | 2026-08-19 | str |

## Inventory  (144,000 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| inventory_id | INV00000001 | str |
| restaurant_id | R001 | str |
| item_id | M0106 | str |
| date | 2025-11-02 | str |
| stock_level | 192 | int64 |
| consumed_qty | 57 | int64 |
| replenished_qty | 41 | int64 |

## Wastage  (4,000 rows)

| Column | Sample Value | Dtype |
|---|---|---|
| wastage_id | WST0000001 | str |
| restaurant_id | R004 | str |
| item_id | M0019 | str |
| date | 2026-07-03 | str |
| wasted_qty | 1.9 | float64 |
| wastage_cost | 11.76 | float64 |
| reason | Overproduction | str |
