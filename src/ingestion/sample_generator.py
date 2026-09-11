"""
High-Performance E-Commerce Data & REST API Mock Generator
Scales to 50,000+ orders, 10,000 customers, and 500 products.
"""

import json
import csv
import random
import os
from datetime import datetime, timedelta, timezone

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sample")

def generate_sample_data(num_customers=10000, num_products=500, num_orders=50000):
    os.makedirs(DATA_DIR, exist_ok=True)
    random.seed(42)

    # 1. Customers (Flat File: CSV)
    cities = ["New York", "San Francisco", "Austin", "Seattle", "Chicago", "Boston", "Denver", "Miami", "Los Angeles", "Atlanta"]
    customer_ids = [f"CUST_{i:06d}" for i in range(1, num_customers + 1)]
    customer_file = os.path.join(DATA_DIR, "raw_customers.csv")
    
    print(f"Generating {num_customers} customers...")
    with open(customer_file, mode="w", newline="", buffering=1024*1024) as f:
        writer = csv.writer(f)
        writer.writerow(["customer_id", "first_name", "last_name", "email", "city", "signup_date"])
        base_date = datetime(2024, 1, 1)
        for cid in customer_ids:
            i = int(cid.split('_')[1])
            fname = f"Customer{i}"
            lname = f"Client{i}"
            email = f"client{i}@example.com"
            city = random.choice(cities)
            signup = (base_date + timedelta(days=random.randint(0, 700))).strftime("%Y-%m-%d")
            writer.writerow([cid, fname, lname, email, city, signup])

    # 2. Products (Flat File: JSON)
    categories = ["Electronics", "Home & Kitchen", "Apparel", "Books", "Sports", "Health & Personal Care", "Automotive", "Toys & Games"]
    products = []
    product_ids = []
    product_file = os.path.join(DATA_DIR, "raw_products.json")
    
    print(f"Generating {num_products} products...")
    for i in range(1, num_products + 1):
        pid = f"PROD_{i:04d}"
        product_ids.append(pid)
        cat = random.choice(categories)
        base_price = round(random.uniform(12.50, 899.99), 2)
        products.append({
            "product_id": pid,
            "product_name": f"{cat} Item {i}",
            "category": cat,
            "unit_price": base_price,
            "in_stock": random.randint(50, 2000)
        })
    with open(product_file, mode="w") as f:
        json.dump(products, f)

    # 3. Orders and Order Items (CSV)
    order_file = os.path.join(DATA_DIR, "raw_orders.csv")
    statuses = ["DELIVERED", "SHIPPED", "PROCESSING"]
    weights = [0.75, 0.18, 0.07] # 100% positive, valid business states

    print(f"Generating {num_orders} orders with synthetic deduplication scenarios...")
    with open(order_file, mode="w", newline="", buffering=2*1024*1024) as f:
        writer = csv.writer(f)
        writer.writerow(["order_id", "customer_id", "product_id", "quantity", "unit_price", "currency", "order_status", "order_date"])
        
        prod_map = {p["product_id"]: p["unit_price"] for p in products}
        currencies = ["USD", "EUR", "GBP"]
        order_base_date = datetime(2025, 1, 1)

        for i in range(1, num_orders + 1):
            oid = f"ORD_{i:06d}"
            cid = random.choice(customer_ids)
            pid = random.choice(product_ids)
            qty = random.randint(1, 6)
            price = prod_map[pid]
            curr = random.choice(currencies)
            status = random.choices(statuses, weights=weights)[0]
            odate = (order_base_date + timedelta(days=random.randint(0, 420), hours=random.randint(0, 23), minutes=random.randint(0, 59))).strftime("%Y-%m-%d %H:%M:%S")

            writer.writerow([oid, cid, pid, qty, price, curr, status, odate])
            # Inject 1% duplicates to rigorously verify deduplication
            if i % 100 == 0:
                writer.writerow([oid, cid, pid, qty, price, curr, status, odate])

    # 4. REST API Mock (Currency Rates & Carrier Service)
    api_payload = {
        "base_currency": "USD",
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "rates": {
            "USD": 1.0,
            "EUR": 1.08,
            "GBP": 1.28
        },
        "shipping_carriers": [
            {"carrier_id": "FEDEX", "sla_days": 2},
            {"carrier_id": "UPS", "sla_days": 3},
            {"carrier_id": "DHL", "sla_days": 4}
        ]
    }
    api_file = os.path.join(DATA_DIR, "mock_rates_api.json")
    with open(api_file, mode="w") as f:
        json.dump(api_payload, f, indent=2)

    print(f"Generated complete enterprise dataset: {num_customers} customers, {num_products} products, {num_orders}+ orders.")

if __name__ == "__main__":
    generate_sample_data()
