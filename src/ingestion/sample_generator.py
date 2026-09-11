"""
Synthetic E-Commerce Data & REST API Mock Generator
Generates:
1. Customers (CSV)
2. Products (JSON)
3. Orders & Order Items (CSV)
4. Currency Exchange Rates / Shipping Status (Mock REST API JSON)
"""

import json
import csv
import random
import os
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sample")

def generate_sample_data(num_customers=100, num_products=40, num_orders=250):
    os.makedirs(DATA_DIR, exist_ok=True)
    random.seed(42)

    # 1. Customers (Flat File: CSV)
    customers = []
    cities = ["New York", "San Francisco", "Austin", "Seattle", "Chicago", "Boston", "Denver", "Miami"]
    customer_file = os.path.join(DATA_DIR, "raw_customers.csv")
    with open(customer_file, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["customer_id", "first_name", "last_name", "email", "city", "signup_date"])
        for i in range(1, num_customers + 1):
            cid = f"CUST_{i:04d}"
            fname = f"User{i}"
            lname = f"Smith{i}"
            email = f"user{i}@example.com"
            city = random.choice(cities)
            signup = (datetime(2025, 1, 1) + timedelta(days=random.randint(0, 360))).strftime("%Y-%m-%d")
            customers.append(cid)
            writer.writerow([cid, fname, lname, email, city, signup])
    print(f"Generated {num_customers} customers -> {customer_file}")

    # 2. Products (Flat File: JSON)
    categories = ["Electronics", "Home & Kitchen", "Apparel", "Books", "Sports"]
    products = []
    product_file = os.path.join(DATA_DIR, "raw_products.json")
    for i in range(1, num_products + 1):
        pid = f"PROD_{i:03d}"
        category = random.choice(categories)
        base_price = round(random.uniform(9.99, 499.99), 2)
        products.append({
            "product_id": pid,
            "product_name": f"{category} Item {i}",
            "category": category,
            "unit_price": base_price,
            "in_stock": random.randint(10, 500)
        })
    with open(product_file, mode="w") as f:
        json.dump(products, f, indent=2)
    print(f"Generated {num_products} products -> {product_file}")

    # 3. Orders and Order Items (CSV)
    order_file = os.path.join(DATA_DIR, "raw_orders.csv")
    statuses = ["DELIVERED", "SHIPPED", "PROCESSING", "CANCELLED"]
    with open(order_file, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["order_id", "customer_id", "product_id", "quantity", "unit_price", "currency", "order_status", "order_date"])
        
        # Inject deliberate duplicate and edge cases for PySpark validation
        for i in range(1, num_orders + 1):
            oid = f"ORD_{i:05d}"
            cid = random.choice(customers)
            prod = random.choice(products)
            qty = random.randint(1, 5)
            curr = random.choice(["USD", "EUR", "GBP"])
            status = random.choices(statuses, weights=[0.65, 0.20, 0.10, 0.05])[0]
            odate = (datetime(2026, 1, 1) + timedelta(days=random.randint(0, 200), hours=random.randint(0, 23))).strftime("%Y-%m-%d %H:%M:%S")
            writer.writerow([oid, cid, prod["product_id"], qty, prod["unit_price"], curr, status, odate])
            
            # 5% duplicate rate to test deduplication
            if i % 20 == 0:
                writer.writerow([oid, cid, prod["product_id"], qty, prod["unit_price"], curr, status, odate])

    print(f"Generated {num_orders}+ orders with deduplication test records -> {order_file}")

    # 4. REST API Mock (Currency Rates & Tracking API Payload)
    api_payload = {
        "base_currency": "USD",
        "last_updated": datetime.utcnow().isoformat(),
        "rates": {
            "USD": 1.0,
            "EUR": 1.08,
            "GBP": 1.28
        },
        "shipping_carriers": [
            {"carrier_id": "FEDEX", "sla_days": 3},
            {"carrier_id": "UPS", "sla_days": 4},
            {"carrier_id": "DHL", "sla_days": 5}
        ]
    }
    api_file = os.path.join(DATA_DIR, "mock_rates_api.json")
    with open(api_file, mode="w") as f:
        json.dump(api_payload, f, indent=2)
    print(f"Generated Mock REST API payload -> {api_file}")

if __name__ == "__main__":
    generate_sample_data()
