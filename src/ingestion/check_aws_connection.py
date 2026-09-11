"""
Diagnostic Script: Verify AWS S3 Connection & Permissions
Tests:
1. Environment variables and credential presence
2. Authentication with AWS STS / IAM
3. Bucket accessibility (List / Head / Put)
4. Provides clear human-readable status & fix instructions
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv

load_dotenv()

def check_connection():
    print("=" * 60)
    print("      🔍 DATAFORGE AWS S3 CONNECTION DIAGNOSTIC        ")
    print("=" * 60)

    endpoint_url = os.getenv("S3_ENDPOINT_URL")
    if endpoint_url and endpoint_url.strip() == "":
        endpoint_url = None

    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    region = os.getenv("AWS_REGION", "us-east-1")
    bucket_name = os.getenv("S3_BUCKET_NAME", "dataforge-lake")

    print(f"Target Environment : {'Local MinIO (S3-compatible)' if endpoint_url else 'Real AWS Cloud S3'}")
    print(f"Endpoint URL       : {endpoint_url if endpoint_url else 'https://s3.' + region + '.amazonaws.com (AWS standard)'}")
    print(f"Configured Region  : {region}")
    print(f"Target Bucket Name : {bucket_name}")
    print(f"Access Key ID      : {aws_access_key[:4] + '****' if aws_access_key and len(aws_access_key) > 4 else '(Not Set)'}")
    print("-" * 60)

    # 1. Initialize Client
    try:
        session = boto3.session.Session()
        if endpoint_url:
            s3 = session.client(
                "s3",
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                endpoint_url=endpoint_url,
                region_name=region
            )
        else:
            s3 = session.client(
                "s3",
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=region
            )
    except Exception as e:
        print(f"❌ Failed to initialize Boto3 S3 client: {e}")
        return False

    # 2. Check Authentication / Identity
    print("\n[Step 1/3] Verifying Identity & Credentials...")
    try:
        if not endpoint_url:
            sts = session.client("sts", aws_access_key_id=aws_access_key, aws_secret_access_key=aws_secret_key, region_name=region)
            identity = sts.get_caller_identity()
            print(f"✅ Authenticated to AWS successfully!")
            print(f"   • Account ID : {identity.get('Account')}")
            print(f"   • IAM User/Role ARN: {identity.get('Arn')}")
        else:
            print("✅ MinIO local endpoint responded to client session.")
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code")
        print(f"❌ Authentication Failed: [{code}] {e}")
        if code == "InvalidAccessKeyId":
            print("   👉 Fix: Your AWS_ACCESS_KEY_ID is invalid or does not exist.")
        elif code == "SignatureDoesNotMatch":
            print("   👉 Fix: Your AWS_SECRET_ACCESS_KEY is incorrect.")
        return False
    except NoCredentialsError:
        print("❌ No AWS credentials found in .env or environment.")
        return False
    except Exception as e:
        print(f"⚠️ STS identity check skipped/failed: {e}")

    # 3. Check Bucket Existence & Access
    print(f"\n[Step 2/3] Checking Access to Bucket '{bucket_name}'...")
    bucket_exists = False
    try:
        s3.head_bucket(Bucket=bucket_name)
        print(f"✅ Bucket '{bucket_name}' exists and is accessible!")
        bucket_exists = True
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code == "404":
            print(f"⚠️ Bucket '{bucket_name}' does not exist yet. Attempting to create it...")
            try:
                if region == "us-east-1":
                    s3.create_bucket(Bucket=bucket_name)
                else:
                    s3.create_bucket(Bucket=bucket_name, CreateBucketConfiguration={"LocationConstraint": region})
                print(f"✅ Bucket '{bucket_name}' successfully created in region {region}!")
                bucket_exists = True
            except Exception as create_err:
                print(f"❌ Could not create bucket: {create_err}")
                print("   👉 Ensure your IAM user has the 's3:CreateBucket' permission.")
                return False
        elif error_code == "403":
            print(f"❌ Access Denied (403) to bucket '{bucket_name}'.")
            print("   👉 This bucket name may already be owned by someone else globally on AWS, or your IAM user lacks S3 permissions.")
            print("   👉 Fix: Change S3_BUCKET_NAME in your .env to a unique name (e.g. dataforge-lake-<your-initials>-2026).")
            return False
        else:
            print(f"❌ Error accessing bucket: {e}")
            return False

    # 4. Write & Read Test Object
    print(f"\n[Step 3/3] Testing Object Upload & Read (Write Permissions)...")
    test_key = "bronze/_connection_test.txt"
    try:
        test_payload = b"DataForge AWS S3 Connection Test: SUCCESS"
        s3.put_object(Bucket=bucket_name, Key=test_key, Body=test_payload)
        print(f"✅ Write verified: Uploaded test object to 's3://{bucket_name}/{test_key}'")

        read_res = s3.get_object(Bucket=bucket_name, Key=test_key)
        content = read_res["Body"].read().decode("utf-8")
        print(f"✅ Read verified: Read content '{content}'")

        # Cleanup
        s3.delete_object(Bucket=bucket_name, Key=test_key)
        print("✅ Cleanup verified: Deleted temporary test object.")
    except Exception as e:
        print(f"❌ PutObject / GetObject permission test failed: {e}")
        print("   👉 Ensure your IAM policy includes 's3:PutObject', 's3:GetObject', and 's3:DeleteObject'.")
        return False

    print("\n" + "=" * 60)
    print("🎉 ALL CHECKS PASSED: AWS S3 is 100% working and ready for DataForge!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = check_connection()
    sys.exit(0 if success else 1)
