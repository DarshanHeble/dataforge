"""
S3 Ingestion Client for DataForge (Bronze Layer)
Seamlessly supports:
1. Real AWS S3 in Cloud (when AWS credentials provided)
2. Local S3 emulation (MinIO)
"""

import os
import sys
import boto3
from botocore.client import Config
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DataForge-Ingestion")

def get_s3_client():
    endpoint_url = os.getenv("S3_ENDPOINT_URL")
    # If S3_ENDPOINT_URL is empty string or None, boto3 routes to real AWS S3 endpoints!
    if endpoint_url and endpoint_url.strip() == "":
        endpoint_url = None

    aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    region_name = os.getenv("AWS_REGION", "us-east-1")

    session = boto3.session.Session()
    
    # If real AWS credentials are present
    if aws_access_key_id and aws_secret_access_key:
        if endpoint_url:
            logger.info(f"Connecting to S3-compatible store at {endpoint_url} (region: {region_name})")
            s3_client = session.client(
                service_name="s3",
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                endpoint_url=endpoint_url,
                region_name=region_name,
                config=Config(s3={"addressing_style": "path"})
            )
        else:
            logger.info(f"Connecting to Real AWS Cloud S3 in region '{region_name}'")
            s3_client = session.client(
                service_name="s3",
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=region_name
            )
    else:
        # Standard AWS credential resolution (e.g. ~/.aws/credentials or IAM role)
        logger.info("Using default AWS environment/IAM credentials for real AWS S3")
        s3_client = session.client("s3", region_name=region_name)

    return s3_client

def ensure_bucket_exists(s3_client, bucket_name: str):
    region_name = os.getenv("AWS_REGION", "us-east-1")
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        logger.info(f"Bucket '{bucket_name}' verified.")
    except Exception:
        logger.info(f"Bucket '{bucket_name}' not found. Attempting creation...")
        try:
            if region_name == "us-east-1":
                s3_client.create_bucket(Bucket=bucket_name)
            else:
                s3_client.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={"LocationConstraint": region_name}
                )
            logger.info(f"Bucket '{bucket_name}' created successfully in {region_name}.")
        except Exception as e:
            logger.warning(f"Could not create bucket '{bucket_name}' ({e}). Assuming bucket already exists or permissions restricted.")

def ingest_bronze_layer():
    bucket_name = os.getenv("S3_BUCKET_NAME", "dataforge-lake")
    s3_client = get_s3_client()
    ensure_bucket_exists(s3_client, bucket_name)

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    sample_dir = os.path.join(base_dir, "data", "sample")
    
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
            logger.warning(f"File {local_path} does not exist.")

    logger.info(f"Bronze ingestion complete: {len(uploaded)} objects uploaded to s3://{bucket_name}/bronze/")
    return uploaded

if __name__ == "__main__":
    try:
        ingest_bronze_layer()
    except Exception as e:
        logger.error(f"Failed to ingest to S3: {e}")
        sys.exit(1)
