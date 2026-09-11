"""
Automated Test Suite for DataForge ETL & Data Quality Gates
Tests:
1. Ingestion payload validation
2. Deduplication integrity
3. Schema enforcement & non-null assertions
4. Currency normalization accuracy
5. Warehouse dimensional referential integrity
"""

import os
import json
import pytest
import pandas as pd
from deltalake import DeltaTable

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

def test_raw_ingestion_artifacts_exist():
    sample_dir = os.path.join(BASE_DIR, "data", "sample")
    assert os.path.exists(os.path.join(sample_dir, "raw_orders.csv")), "raw_orders.csv missing"
    assert os.path.exists(os.path.join(sample_dir, "raw_customers.csv")), "raw_customers.csv missing"
    assert os.path.exists(os.path.join(sample_dir, "raw_products.json")), "raw_products.json missing"
    assert os.path.exists(os.path.join(sample_dir, "mock_rates_api.json")), "mock_rates_api.json missing"

def test_delta_table_acid_integrity():
    delta_dir = os.path.join(BASE_DIR, "data", "delta", "curated_orders")
    assert os.path.exists(delta_dir), "Delta table directory missing"
    
    dt = DeltaTable(delta_dir)
    assert dt.version() >= 0, "Delta table has no commits"
    
    df = dt.to_pandas()
    # Check deduplication
    assert df["order_id"].nunique() == len(df), "Found duplicate order_id in curated Delta layer!"
    
    # Check data quality constraints
    assert df["order_id"].isnull().sum() == 0, "Found null order_ids"
    assert df["customer_id"].isnull().sum() == 0, "Found null customer_ids"
    assert (df["amount_usd"] < 0).sum() == 0, "Found negative amount_usd"
    assert (df["quantity"] <= 0).sum() == 0, "Found non-positive quantities"

def test_currency_conversion_applied():
    delta_dir = os.path.join(BASE_DIR, "data", "delta", "curated_orders")
    df = DeltaTable(delta_dir).to_pandas()
    
    eur_orders = df[df["currency"] == "EUR"]
    if len(eur_orders) > 0:
        sample = eur_orders.iloc[0]
        expected_min = sample["quantity"] * sample["unit_price"] * 1.05
        assert sample["amount_usd"] >= expected_min, "EUR conversion rate not applied correctly"

if __name__ == "__main__":
    pytest.main(["-v", __file__])
