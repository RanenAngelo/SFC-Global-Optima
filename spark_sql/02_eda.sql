-- DineIQ Analytics — Step 8 EDA (SRS: 13 EDA outputs). Executed by spark_jobs/eda.py.
-- Each SELECT below produces one EDA result set (persisted to reports/eda_report.json).

-- Q01 top_selling_dishes -------------------------------------------------------
SELECT item_id, item_name, SUM(quantity) AS units_sold
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY item_id, item_name ORDER BY units_sold DESC LIMIT 10;

-- Q02 lowest_selling_dishes ------------------------------------------------------
SELECT item_id, item_name, SUM(quantity) AS units_sold
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY item_id, item_name ORDER BY units_sold ASC LIMIT 10;

-- Q03 highest_revenue_dishes -------------------------------------------------------
SELECT item_id, item_name, ROUND(SUM(line_total), 2) AS revenue
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY item_id, item_name ORDER BY revenue DESC LIMIT 10;

-- Q04 highest_profit_dishes ---------------------------------------------------------
SELECT item_id, item_name, ROUND(SUM(line_margin), 2) AS profit
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY item_id, item_name ORDER BY profit DESC LIMIT 10;

-- Q05 highest_margin_dishes -----------------------------------------------------------
SELECT item_id, item_name,
       ROUND(100 * SUM(line_margin) / SUM(line_total), 2) AS margin_pct,
       COUNT(*) AS lines
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY item_id, item_name HAVING COUNT(*) >= 20
ORDER BY margin_pct DESC LIMIT 10;

-- Q06 high_wastage_dishes -----------------------------------------------------------------
SELECT item_id, item_name, ROUND(SUM(wasted_qty), 1) AS wasted_qty,
       ROUND(SUM(wastage_cost), 2) AS wastage_cost
FROM fact_wastage GROUP BY item_id, item_name ORDER BY wasted_qty DESC LIMIT 10;

-- Q07 best_rated_dishes ----------------------------------------------------------------------
SELECT item_id, item_name, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS n
FROM fact_ratings GROUP BY item_id, item_name HAVING COUNT(*) >= 10
ORDER BY avg_rating DESC LIMIT 10;

-- Q08 poorly_rated_dishes -----------------------------------------------------------------------
SELECT item_id, item_name, ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS n
FROM fact_ratings GROUP BY item_id, item_name HAVING COUNT(*) >= 10
ORDER BY avg_rating ASC LIMIT 10;

-- Q09 popular_menu_categories --------------------------------------------------------------------
SELECT category_id, category_name, SUM(quantity) AS units,
       ROUND(SUM(line_total), 2) AS revenue
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY category_id, category_name ORDER BY revenue DESC;

-- Q10 peak_ordering_periods -------------------------------------------------------------------------
SELECT order_hour AS hour, COUNT(DISTINCT order_id) AS orders
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY order_hour ORDER BY hour;

-- Q11 location_sales_patterns --------------------------------------------------------------------------
SELECT restaurant_id, restaurant_name, city, COUNT(DISTINCT order_id) AS orders,
       ROUND(SUM(line_total), 2) AS revenue
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY restaurant_id, restaurant_name, city ORDER BY revenue DESC;

-- Q12 channel_ordering_patterns ---------------------------------------------------------------------------
SELECT channel, COUNT(DISTINCT order_id) AS orders, ROUND(SUM(line_total), 2) AS revenue,
       ROUND(SUM(line_total) / COUNT(DISTINCT order_id), 2) AS aov
FROM fact_order_lines WHERE status = 'Completed'
GROUP BY channel ORDER BY revenue DESC;

-- Q13 promotion_driven_sales --------------------------------------------------------------------------------
SELECT CASE WHEN line_promotion_id IS NOT NULL OR order_promotion_id IS NOT NULL
            THEN 'promo' ELSE 'no_promo' END AS grp,
       COUNT(DISTINCT order_id) AS orders, ROUND(SUM(line_total), 2) AS revenue
FROM fact_order_lines WHERE status = 'Completed' GROUP BY grp;
