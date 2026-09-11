"""
Apache Airflow DAG: dataforge_ecommerce_etl
Full Orchestration Pipeline:
1. Ingest flat files & REST API rates into S3 Bronze Lakehouse (Boto3)
2. Run Delta Lakehouse transformation & deduplication (Delta-RS)
3. Execute automated Data Quality gate assertions
4. Load Star-Schema fact & dimension tables into PostgreSQL
"""

from datetime import datetime, timedelta
import os
import sys
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
    description="Automated E-Commerce Lakehouse & Star-Schema Pipeline",
    schedule_interval="@daily",
    catchup=False,
    tags=["ecommerce", "s3", "delta-lake", "warehouse", "dataforge"],
) as dag:

    # 1. Ingest raw flat files and mock REST API to S3 / MinIO
    task_ingest_s3 = BashOperator(
        task_id="ingest_bronze_s3",
        bash_command="python3 /opt/airflow/src/ingestion/s3_uploader.py || python3 ./src/ingestion/s3_uploader.py",
    )

    # 2. Delta Lakehouse ACID write & deduplication
    task_delta_transform = BashOperator(
        task_id="delta_lakehouse_transform",
        bash_command="python3 /opt/airflow/src/transformation/delta_lakehouse.py || python3 ./src/transformation/delta_lakehouse.py",
    )

    # 3. Data Quality Gate (Assertions)
    def verify_data_quality(**kwargs):
        from deltalake import DeltaTable
        base_dir = "/opt/airflow/data/delta/curated_orders"
        if not os.path.exists(base_dir):
            base_dir = "./data/delta/curated_orders"
        
        print(f"Running Data Quality Checks on Delta Table at {base_dir}...")
        dt = DeltaTable(base_dir)
        df = dt.to_pandas()
        
        assert len(df) > 0, "DQ Check Failed: Empty dataset in Delta layer!"
        assert df["order_id"].isnull().sum() == 0, "DQ Check Failed: Null order_id found!"
        assert (df["amount_usd"] < 0).sum() == 0, "DQ Check Failed: Negative amounts found!"
        assert df["order_id"].nunique() == len(df), "DQ Check Failed: Duplicates exist!"
        print(f"Data Quality Gate Passed: Successfully verified {len(df):,} pristine records.")

    task_dq_gate = PythonOperator(
        task_id="data_quality_gate",
        python_callable=verify_data_quality,
    )

    # 4. Load Star-Schema Warehouse in PostgreSQL
    task_load_warehouse = BashOperator(
        task_id="load_postgres_warehouse",
        bash_command="python3 /opt/airflow/src/warehouse/loader.py || python3 ./src/warehouse/loader.py",
    )

    # Pipeline DAG Dependency Flow
    task_ingest_s3 >> task_delta_transform >> task_dq_gate >> task_load_warehouse
