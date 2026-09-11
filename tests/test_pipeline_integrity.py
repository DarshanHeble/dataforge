"""
Automated Test Suite for DataForge ETL, S3 Lakehouse & Data Quality Gates
"""

import os
import sys
import pytest
import pandas as pd
from deltalake import DeltaTable

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

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

def test_s3_lake_bucket_and_objects():
    from src.ingestion.s3_uploader import get_s3_client
    s3 = get_s3_client()
    bucket = "dataforge-lake"
    
    # Verify bucket exists and contains raw lake objects
    response = s3.list_objects_v2(Bucket=bucket, Prefix="bronze/")
    assert "Contents" in response, "Bronze layer empty in S3 bucket!"
    
    keys = [item["Key"] for item in response["Contents"]]
    assert "bronze/orders/raw_orders.csv" in keys, "raw_orders.csv missing from S3 bronze layer!"
    assert "bronze/customers/raw_customers.csv" in keys, "raw_customers.csv missing from S3 bronze layer!"
    assert "bronze/reference_rates/rates.json" in keys, "rates.json missing from S3 bronze layer!"

def test_airflow_dag_integrity():
    # Verify DAG syntax and structure
    dag_path = os.path.join(BASE_DIR, "dags", "dataforge_ecommerce_dag.py")
    assert os.path.exists(dag_path), "Airflow DAG file missing!"
    
    with open(dag_path, "r") as f:
        content = f.read()
    
    # Assert DAG ID and task sequences
    assert 'dag_id="dataforge_ecommerce_etl"' in content, "DAG ID not configured correctly"
    assert "task_ingest_s3" in content, "S3 ingestion task missing"
    assert "task_delta_transform" in content, "Transformation task missing"
    assert "task_dq_gate" in content, "Data quality gate task missing"
    assert "task_load_warehouse" in content, "Warehouse load task missing"
    assert "task_ingest_s3 >> task_delta_transform >> task_dq_gate >> task_load_warehouse" in content, "Task flow invalid"
