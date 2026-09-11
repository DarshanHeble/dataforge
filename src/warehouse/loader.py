"""
Data Warehouse Loader for PostgreSQL
Loads Curated Silver/Delta Records into Star-Schema Dimensional Warehouse with High-Performance Batch Loading.
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
            port=int(os.getenv("POSTGRES_PORT", "5433")),
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
    delta_dir = os.path.join(base_dir, "data", "delta", "curated_orders")

    conn = get_postgres_connection()
    cursor = conn.cursor()

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

    # 1. Batch Load Customers Dimension
    cust_file = os.path.join(sample_dir, "raw_customers.csv")
    customers = []
    with open(cust_file, "r") as f:
        reader = csv.DictReader(f)
        for r in reader:
            customers.append((r["customer_id"], r["first_name"], r["last_name"], r["email"], r["city"], r["signup_date"]))
    cursor.executemany("INSERT OR REPLACE INTO dim_customer VALUES (?, ?, ?, ?, ?, ?)", customers)

    # 2. Batch Load Products Dimension
    prod_file = os.path.join(sample_dir, "raw_products.json")
    with open(prod_file, "r") as f:
        raw_prods = json.load(f)
        products = [(p["product_id"], p["product_name"], p["category"], p["unit_price"]) for p in raw_prods]
    cursor.executemany("INSERT OR REPLACE INTO dim_product VALUES (?, ?, ?, ?)", products)

    # 3. Read from Delta Table for Fact Load
    from deltalake import DeltaTable
    logger.info(f"Reading from Delta Table at {delta_dir} for warehouse load...")
    dt = DeltaTable(delta_dir)
    orders_df = dt.to_pandas()

    fact_records = []
    for _, r in orders_df.iterrows():
        dt_obj = datetime.strptime(str(r["order_date"]), "%Y-%m-%d %H:%M:%S")
        date_id = int(dt_obj.strftime("%Y%m%d"))
        fact_records.append((
            str(r["order_id"]), str(r["customer_id"]), str(r["product_id"]), date_id,
            str(r["order_date"]), int(r["quantity"]), float(r["unit_price"]), str(r["currency"]),
            float(r["amount_usd"]), str(r["order_status"])
        ))

    logger.info(f"Writing {len(fact_records)} fact rows into warehouse...")
    cursor.executemany("INSERT OR REPLACE INTO fact_order_sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", fact_records)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM dim_customer")
    cust_cnt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM dim_product")
    prod_cnt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*), SUM(amount_usd) FROM fact_order_sales")
    order_metrics = cursor.fetchone()
    conn.close()

    logger.info(f"Warehouse Sync Complete! Customers: {cust_cnt:,} | Products: {prod_cnt:,} | Orders: {order_metrics[0]:,} | Total Gross Revenue: ${order_metrics[1]:,.2f}")
    return {
        "customers_loaded": cust_cnt,
        "products_loaded": prod_cnt,
        "orders_loaded": order_metrics[0],
        "total_revenue_usd": round(order_metrics[1], 2)
    }

if __name__ == "__main__":
    load_warehouse()
