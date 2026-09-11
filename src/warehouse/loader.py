"""
Data Warehouse Loader for PostgreSQL
Loads Silver Cleaned/Curated Data into Star Schema Fact and Dimension Tables with Idempotency.
"""

import os
import sys
import json
import csv
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DataForge-WarehouseLoader")

def get_postgres_connection():
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            database=os.getenv("POSTGRES_DB", "dataforge_db"),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres")
        )
        return conn
    except Exception as e:
        logger.warning(f"Could not connect to live PostgreSQL ({e}). Using SQLite mock warehouse for offline test & validation.")
        import sqlite3
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        db_path = os.path.join(base_dir, "data", "dataforge_warehouse.db")
        return sqlite3.connect(db_path)

def load_warehouse():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    sample_dir = os.path.join(base_dir, "data", "sample")
    silver_dir = os.path.join(base_dir, "data", "silver")

    conn = get_postgres_connection()
    cursor = conn.cursor()

    # DDL Execution for local testing (SQLite or Postgres syntax compatible)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dim_customer (
        customer_id TEXT PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        city TEXT,
        signup_date TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dim_product (
        product_id TEXT PRIMARY KEY,
        product_name TEXT,
        category TEXT,
        base_price REAL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fact_order_sales (
        order_id TEXT PRIMARY KEY,
        customer_id TEXT,
        product_id TEXT,
        date_id INT,
        order_date TEXT,
        quantity INT,
        unit_price REAL,
        original_currency TEXT,
        amount_usd REAL,
        order_status TEXT
    );
    """)

    # 1. Load Customers Dimension
    cust_file = os.path.join(sample_dir, "raw_customers.csv")
    with open(cust_file, "r") as f:
        reader = csv.DictReader(f)
        for r in reader:
            cursor.execute("""
                INSERT OR REPLACE INTO dim_customer (customer_id, first_name, last_name, email, city, signup_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (r["customer_id"], r["first_name"], r["last_name"], r["email"], r["city"], r["signup_date"]))

    # 2. Load Products Dimension
    prod_file = os.path.join(sample_dir, "raw_products.json")
    with open(prod_file, "r") as f:
        products = json.load(f)
        for p in products:
            cursor.execute("""
                INSERT OR REPLACE INTO dim_product (product_id, product_name, category, base_price)
                VALUES (?, ?, ?, ?)
            """, (p["product_id"], p["product_name"], p["category"], p["unit_price"]))

    # 3. Load Fact Table from Silver
    silver_json = os.path.join(silver_dir, "curated_orders.json")
    loaded_orders = 0
    if os.path.exists(silver_json):
        with open(silver_json, "r") as f:
            curated_orders = json.load(f)
            for o in curated_orders:
                # Generate date_id YYYYMMDD
                dt = datetime.strptime(o["order_date"], "%Y-%m-%d %H:%M:%S")
                date_id = int(dt.strftime("%Y%m%d"))
                cursor.execute("""
                    INSERT OR REPLACE INTO fact_order_sales 
                    (order_id, customer_id, product_id, date_id, order_date, quantity, unit_price, original_currency, amount_usd, order_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    o["order_id"], o["customer_id"], o["product_id"], date_id,
                    o["order_date"], o["quantity"], o["unit_price"], o["currency"],
                    o["amount_usd"], o["order_status"]
                ))
                loaded_orders += 1

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM dim_customer")
    cust_cnt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dim_product")
    prod_cnt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*), SUM(amount_usd) FROM fact_order_sales")
    order_metrics = cursor.fetchone()
    conn.close()

    logger.info(f"Warehouse Sync Complete! Customers: {cust_cnt} | Products: {prod_cnt} | Orders: {order_metrics[0]} | Total Gross Revenue: ${order_metrics[1]:,.2f}")
    return {
        "customers_loaded": cust_cnt,
        "products_loaded": prod_cnt,
        "orders_loaded": order_metrics[0],
        "total_revenue_usd": round(order_metrics[1], 2)
    }

if __name__ == "__main__":
    load_warehouse()
