-- ==========================================================
-- DataForge: E-Commerce Dimensional Data Warehouse Schema
-- Star Schema with Fact & Dimension Tables
-- ==========================================================

-- Schema creation
CREATE SCHEMA IF NOT EXISTS dataforge_warehouse;
SET search_path TO dataforge_warehouse, public;

-- 1. Date Dimension
CREATE TABLE IF NOT EXISTS dim_date (
    date_id INT PRIMARY KEY,
    full_date DATE NOT NULL UNIQUE,
    year INT NOT NULL,
    quarter INT NOT NULL,
    month INT NOT NULL,
    month_name VARCHAR(15) NOT NULL,
    day INT NOT NULL,
    day_name VARCHAR(15) NOT NULL,
    is_weekend BOOLEAN NOT NULL
);

-- 2. Customer Dimension
CREATE TABLE IF NOT EXISTS dim_customer (
    customer_id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    city VARCHAR(100),
    signup_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product Dimension
CREATE TABLE IF NOT EXISTS dim_product (
    product_id VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    base_price NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Orders Fact Table (Grain: 1 row per order item line)
CREATE TABLE IF NOT EXISTS fact_order_sales (
    order_id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) REFERENCES dim_customer(customer_id),
    product_id VARCHAR(50) REFERENCES dim_product(product_id),
    date_id INT,
    order_date TIMESTAMP NOT NULL,
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    original_currency VARCHAR(10) NOT NULL,
    amount_usd NUMERIC(12, 2) NOT NULL,
    order_status VARCHAR(50) NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Analytical Views / Marts
CREATE OR REPLACE VIEW v_daily_category_revenue AS
SELECT 
    d.full_date,
    p.category,
    COUNT(f.order_id) AS total_orders,
    SUM(f.quantity) AS total_units_sold,
    SUM(f.amount_usd) AS gross_revenue_usd,
    ROUND(AVG(f.amount_usd), 2) AS avg_order_value_usd
FROM fact_order_sales f
JOIN dim_product p ON f.product_id = p.product_id
JOIN dim_date d ON f.date_id = d.date_id
WHERE f.order_status = 'DELIVERED'
GROUP BY d.full_date, p.category;

CREATE OR REPLACE VIEW v_customer_lifetime_metrics AS
SELECT 
    c.customer_id,
    c.first_name || ' ' || c.last_name AS full_name,
    c.city,
    COUNT(f.order_id) AS total_orders,
    SUM(f.amount_usd) AS lifetime_spend_usd,
    MAX(f.order_date) AS last_order_date
FROM dim_customer c
LEFT JOIN fact_order_sales f ON c.customer_id = f.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name, c.city;
