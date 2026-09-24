-- DineIQ Analytics — Step 6 Data Integration (SRS: all 10 required relationships).
-- Executed by spark_jobs/integrate.py against cleaned-parquet temp views.
-- Output views are persisted to parquet_data/processed/ (partitioned fact).

-- 1) Orders+customers / orders+items / items+menu / menu+categories /
--    orders+locations / orders+promotions  =>  fact_order_lines ----------------
CREATE OR REPLACE TEMP VIEW fact_order_lines AS
SELECT
  oi.order_item_id,
  o.order_id,
  o.customer_id,
  c.home_city            AS customer_home_city,
  c.preferred_channel    AS customer_preferred_channel,
  o.restaurant_id,
  r.restaurant_name,
  r.city,
  r.restaurant_type,
  oi.item_id,
  m.item_name,
  m.category_id,
  cat.category_name,
  oi.promotion_id        AS line_promotion_id,
  o.promotion_id         AS order_promotion_id,
  o.status,
  o.channel,
  o.order_datetime,
  CAST(o.order_datetime AS DATE)              AS order_date,
  date_format(o.order_datetime, 'yyyy-MM')    AS order_month,
  year(o.order_datetime)                      AS order_year,
  dayofweek(o.order_datetime)                 AS dow,
  hour(o.order_datetime)                      AS order_hour,
  CASE WHEN dayofweek(o.order_datetime) IN (6, 7) THEN 1 ELSE 0 END AS is_weekend,
  oi.quantity,
  oi.unit_price,
  oi.discount_pct,
  oi.line_total,
  m.base_cost            AS item_cost,
  ROUND(oi.quantity * m.base_cost, 2)         AS line_cost,
  ROUND(oi.line_total - oi.quantity * m.base_cost, 2) AS line_margin
FROM clean_order_items oi
JOIN clean_orders o      ON oi.order_id = o.order_id
JOIN clean_menu_items m  ON oi.item_id = m.item_id
JOIN clean_menu_categories cat ON m.category_id = cat.category_id
JOIN clean_restaurants r ON o.restaurant_id = r.restaurant_id
LEFT JOIN clean_customers c   ON o.customer_id = c.customer_id;

-- 2) Menu items + pricing history => dim_menu_price --------------------------------
CREATE OR REPLACE TEMP VIEW dim_menu_price AS
SELECT m.*, ph.price AS latest_price, ph.effective_from AS price_effective_from
FROM clean_menu_items m
LEFT JOIN (
  SELECT item_id, price, effective_from,
         ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY effective_from DESC) AS rn
  FROM clean_pricing_history
) ph ON m.item_id = ph.item_id AND ph.rn = 1;

-- 3) Menu items + ratings => fact_ratings -------------------------------------------
CREATE OR REPLACE TEMP VIEW fact_ratings AS
SELECT rt.*, m.item_name, m.category_id, r.city
FROM clean_ratings rt
JOIN clean_menu_items m  ON rt.item_id = m.item_id
JOIN clean_restaurants r ON rt.restaurant_id = r.restaurant_id;

-- 4) Menu items + inventory => fact_inventory ------------------------------------------
CREATE OR REPLACE TEMP VIEW fact_inventory AS
SELECT i.*, m.item_name, m.category_id, r.city
FROM clean_inventory i
JOIN clean_menu_items m  ON i.item_id = m.item_id
JOIN clean_restaurants r ON i.restaurant_id = r.restaurant_id;

-- 5) Menu items + wastage => fact_wastage -----------------------------------------------
CREATE OR REPLACE TEMP VIEW fact_wastage AS
SELECT w.*, m.item_name, m.category_id, m.base_cost, r.city
FROM clean_wastage w
JOIN clean_menu_items m  ON w.item_id = m.item_id
JOIN clean_restaurants r ON w.restaurant_id = r.restaurant_id;
