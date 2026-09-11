"""
Apache Airflow DAG: dataforge_ecommerce_etl
Orchestrates:
1. Data Quality Pre-Checks
2. Ingesting Raw Files and REST API into Bronze S3/MinIO
3. PySpark Silver Transformations & Curated Deduplication
4. Data Quality Gate Assertions
5. Loading Star-Schema Warehouse in PostgreSQL
6. Alerting and Logging
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "dataforge-team",
    "depends_on_past": False,
    "start_date": datetime(2026, 1, 1),
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=1),
}

with DAG(
    dag_id="dataforge_ecommerce_etl",
    default_args=default_args,
    description="End-to-End E-Commerce ETL: API & Flat Files -> Bronze S3 -> Silver PySpark -> Gold PostgreSQL",
    schedule_interval="@daily",
    catchup=False,
    tags=["ecommerce", "pyspark", "s3", "warehouse", "dataforge"],
) as dag:

    # 1. Ingestion Step
    task_ingest_bronze = BashOperator(
        task_id="ingest_bronze_s3",
        bash_command="python3 /opt/airflow/dags/../src/ingestion/s3_uploader.py || python3 /home/darshan/Projects/dataforge/src/ingestion/s3_uploader.py",
    )

    # 2. PySpark Silver Transformation
    task_pyspark_transform = BashOperator(
        task_id="pyspark_silver_transform",
        bash_command="python3 /opt/airflow/dags/../src/transformation/spark_transform.py || python3 /home/darshan/Projects/dataforge/src/transformation/spark_transform.py",
    )

    # 3. Data Quality Gate
    def verify_data_quality(**kwargs):
        import os
        import json
        print("Running Data Quality Checks on Silver Parquet/JSON artifacts...")
        # Check that silver output exists and has valid rows
        silver_path = "/opt/airflow/dags/../data/silver/curated_orders.json"
        if not os.path.exists(silver_path):
            silver_path = "/home/darshan/Projects/dataforge/data/silver/curated_orders.json"
        
        with open(silver_path, "r") as f:
            data = json.load(f)
            assert len(data) > 0, "Empty dataset in Silver tier!"
            for row in data:
                assert row["order_id"] is not None, "Null order_id found!"
                assert row["amount_usd"] >= 0, "Negative amount found!"
        print(f"Passed DQ Gate: Verified {len(data)} pristine records.")

    task_dq_gate = PythonOperator(
        task_id="data_quality_gate",
        python_callable=verify_data_quality,
    )

    # 4. Load Star-Schema Warehouse
    task_load_warehouse = BashOperator(
        task_id="load_postgres_warehouse",
        bash_command="python3 /opt/airflow/dags/../src/warehouse/loader.py || python3 /home/darshan/Projects/dataforge/src/warehouse/loader.py",
    )

    # Pipeline Flow
    task_ingest_bronze >> task_pyspark_transform >> task_dq_gate >> task_load_warehouse
