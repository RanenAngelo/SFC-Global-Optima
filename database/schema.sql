-- DineIQ Analytics SQLite DDL (generated from src/common/models.py)

CREATE TABLE audit_log (
	id INTEGER NOT NULL, 
	ts DATETIME, 
	username VARCHAR(64), 
	action VARCHAR(64) NOT NULL, 
	detail TEXT, 
	PRIMARY KEY (id)
);

CREATE TABLE customers (
	customer_id VARCHAR(16) NOT NULL, 
	home_city VARCHAR(64), 
	signup_date DATE, 
	preferred_channel VARCHAR(32), 
	true_segment VARCHAR(32), 
	PRIMARY KEY (customer_id)
);

CREATE TABLE menu_categories (
	category_id VARCHAR(16) NOT NULL, 
	category_name VARCHAR(64) NOT NULL, 
	PRIMARY KEY (category_id), 
	UNIQUE (category_name)
);

CREATE TABLE model_registry (
	id INTEGER NOT NULL, 
	name VARCHAR(64) NOT NULL, 
	version VARCHAR(16) NOT NULL, 
	pipeline VARCHAR(16) NOT NULL, 
	task VARCHAR(64) NOT NULL, 
	trained_at DATETIME, 
	train_range VARCHAR(64), 
	params TEXT, 
	metrics TEXT, 
	artifact_path VARCHAR(256), 
	PRIMARY KEY (id)
);

CREATE TABLE pipeline_runs (
	id INTEGER NOT NULL, 
	pipeline VARCHAR(32) NOT NULL, 
	stage VARCHAR(64) NOT NULL, 
	status VARCHAR(16) NOT NULL, 
	started_at DATETIME, 
	finished_at DATETIME, 
	records_in INTEGER, 
	records_out INTEGER, 
	message TEXT, 
	PRIMARY KEY (id)
);

CREATE TABLE promotions (
	promotion_id VARCHAR(16) NOT NULL, 
	promotion_name VARCHAR(128) NOT NULL, 
	scope VARCHAR(16), 
	target_id VARCHAR(16), 
	discount_pct FLOAT, 
	start_date DATE, 
	end_date DATE, 
	channel VARCHAR(32), 
	is_trap_flag BOOLEAN, 
	PRIMARY KEY (promotion_id)
);

CREATE TABLE recommendation_state (
	rec_id VARCHAR(16) NOT NULL, 
	state VARCHAR(16) NOT NULL, 
	username VARCHAR(64), 
	updated_at DATETIME, 
	PRIMARY KEY (rec_id)
);

CREATE TABLE restaurants (
	restaurant_id VARCHAR(16) NOT NULL, 
	restaurant_name VARCHAR(128) NOT NULL, 
	city VARCHAR(64) NOT NULL, 
	region VARCHAR(64), 
	restaurant_type VARCHAR(32), 
	opening_date DATE, 
	performance_tier VARCHAR(16), 
	PRIMARY KEY (restaurant_id)
);

CREATE TABLE users (
	id INTEGER NOT NULL, 
	username VARCHAR(64) NOT NULL, 
	password_hash VARCHAR(128) NOT NULL, 
	role VARCHAR(16) NOT NULL, 
	is_active BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (username)
);

CREATE TABLE menu_items (
	item_id VARCHAR(16) NOT NULL, 
	item_name VARCHAR(128) NOT NULL, 
	category_id VARCHAR(16), 
	base_cost FLOAT, 
	base_price FLOAT, 
	is_active BOOLEAN, 
	introduced_date DATE, 
	demand_tier VARCHAR(16), 
	wastage_tag VARCHAR(16), 
	price_sensitivity_tag VARCHAR(16), 
	seasonal_tag BOOLEAN, 
	promo_dependent_tag BOOLEAN, 
	PRIMARY KEY (item_id), 
	FOREIGN KEY(category_id) REFERENCES menu_categories (category_id)
);

CREATE TABLE orders (
	row_id INTEGER NOT NULL, 
	order_id VARCHAR(16) NOT NULL, 
	customer_id VARCHAR(16), 
	restaurant_id VARCHAR(16), 
	order_datetime DATETIME, 
	channel VARCHAR(32), 
	promotion_id VARCHAR(16), 
	status VARCHAR(16), 
	total_amount FLOAT, 
	PRIMARY KEY (row_id), 
	UNIQUE (order_id, row_id), 
	FOREIGN KEY(customer_id) REFERENCES customers (customer_id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (restaurant_id), 
	FOREIGN KEY(promotion_id) REFERENCES promotions (promotion_id)
);

CREATE TABLE inventory (
	inventory_id VARCHAR(16) NOT NULL, 
	restaurant_id VARCHAR(16), 
	item_id VARCHAR(16), 
	date DATE, 
	stock_level INTEGER, 
	consumed_qty INTEGER, 
	replenished_qty INTEGER, 
	PRIMARY KEY (inventory_id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (restaurant_id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (item_id)
);

CREATE TABLE order_items (
	order_item_id VARCHAR(16) NOT NULL, 
	order_id VARCHAR(16) NOT NULL, 
	item_id VARCHAR(16), 
	quantity INTEGER, 
	unit_price FLOAT, 
	discount_pct FLOAT, 
	promotion_id VARCHAR(16), 
	line_total FLOAT, 
	PRIMARY KEY (order_item_id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (item_id), 
	FOREIGN KEY(promotion_id) REFERENCES promotions (promotion_id)
);

CREATE TABLE pricing_history (
	price_id VARCHAR(16) NOT NULL, 
	item_id VARCHAR(16) NOT NULL, 
	price FLOAT, 
	effective_from DATE, 
	effective_to DATE, 
	PRIMARY KEY (price_id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (item_id)
);

CREATE TABLE ratings (
	rating_id VARCHAR(16) NOT NULL, 
	customer_id VARCHAR(16), 
	item_id VARCHAR(16), 
	restaurant_id VARCHAR(16), 
	order_id VARCHAR(16), 
	rating INTEGER, 
	review_date DATE, 
	PRIMARY KEY (rating_id), 
	FOREIGN KEY(customer_id) REFERENCES customers (customer_id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (item_id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (restaurant_id)
);

CREATE TABLE wastage (
	wastage_id VARCHAR(16) NOT NULL, 
	restaurant_id VARCHAR(16), 
	item_id VARCHAR(16), 
	date DATE, 
	wasted_qty FLOAT, 
	wastage_cost FLOAT, 
	reason VARCHAR(32), 
	PRIMARY KEY (wastage_id), 
	FOREIGN KEY(restaurant_id) REFERENCES restaurants (restaurant_id), 
	FOREIGN KEY(item_id) REFERENCES menu_items (item_id)
);
