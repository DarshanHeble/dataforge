"""
S3 Ingestion Client for DataForge (Bronze Layer)
Supports both AWS S3 and S3-compatible local stores (MinIO/LocalStack).
"""

import os
import sys
import boto3
from botocore.client import Config
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DataForge-Ingestion")

def get_s3_client():
    endpoint_url = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID", "minioadmin")
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY", "minioadmin")
    region_name = os.getenv("AWS_REGION", "us-east-1")

    session = boto3.session.Session()
    s3_client = session.client(
        service_name="s3",
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        endpoint_url=endpoint_url if endpoint_url else None,
        region_name=region_name,
        config=Config(s3={"addressing_style": "path"})
    )
    return s3_client

def ensure_bucket_exists(s3_client, bucket_name: str):
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        logger.info(f"Bucket '{bucket_name}' verified.")
    except Exception:
        logger.info(f"Bucket '{bucket_name}' not found. Creating...")
        s3_client.create_bucket(Bucket=bucket_name)
        logger.info(f"Bucket '{bucket_name}' created successfully.")

def ingest_bronze_layer(bucket_name: str = "dataforge-lake"):
    s3_client = get_s3_client()
    ensure_bucket_exists(s3_client, bucket_name)

    sample_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sample")
    files_to_upload = {
        "raw_customers.csv": "bronze/customers/raw_customers.csv",
        "raw_products.json": "bronze/products/raw_products.json",
        "raw_orders.csv": "bronze/orders/raw_orders.csv",
        "mock_rates_api.json": "bronze/reference_rates/rates.json"
    }

    uploaded = []
    for local_name, s3_key in files_to_upload.items():
        local_path = os.path.join(sample_dir, local_name)
        if os.path.exists(local_path):
            logger.info(f"Uploading {local_path} -> s3://{bucket_name}/{s3_key}")
            s3_client.upload_file(local_path, bucket_name, s3_key)
            uploaded.append(s3_key)
        else:
            logger.warning(f"File {local_path} does not exist. Run sample_generator.py first.")

    return uploaded

if __name__ == "__main__":
    try:
        ingest_bronze_layer()
    except Exception as e:
        logger.error(f"Failed to ingest to S3/MinIO: {e}")
        sys.exit(1)
