#!/usr/bin/env bash
# ==============================================================================
# DataForge: One-Click Master Pipeline & Platform Launcher
# Executes:
# 1. 50,000+ Enterprise Data Generation (Orders, Customers, Products, REST API)
# 2. Ingests Raw Data into AWS S3 / MinIO Bronze Bucket (Boto3)
# 3. Delta Lakehouse ACID Ingestion & Partitioning via Delta-RS
# 4. Time-Travel & ACID Transaction Verification
# 5. Star-Schema Data Warehouse Batch Load (PostgreSQL / SQLite)
# 6. Starts Docker Compose infrastructure (PostgreSQL on 5433, MinIO S3 on 9000/9001)
# 7. Launches React UI Dashboard
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${CYAN}        ⚡ DATAFORGE: ENTERPRISE DELTA LAKEHOUSE      ${NC}"
echo -e "${BLUE}=====================================================${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 1. Ensure Docker S3 (MinIO) and Postgres are active
echo -e "\n${YELLOW}[Step 1/6] Checking Docker Infrastructure (MinIO S3 & Postgres)...${NC}"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    docker-compose up -d minio postgres
    echo -e "${GREEN}Services active: MinIO S3 (http://localhost:9001) | Postgres (localhost:5433)${NC}"
else
    echo -e "${YELLOW}Docker not running; proceeding with local storage emulation.${NC}"
fi

# 2. Generate 50,000+ Records
echo -e "\n${YELLOW}[Step 2/6] Generating 50,000+ Ingestion Records & Mock REST API...${NC}"
python3 "$PROJECT_ROOT/src/ingestion/sample_generator.py"

# 3. Ingest into S3 / MinIO Bronze Layer
echo -e "\n${YELLOW}[Step 3/6] Uploading Raw Assets to S3 / MinIO (s3://dataforge-lake/bronze/)...${NC}"
python3 "$PROJECT_ROOT/src/ingestion/s3_uploader.py"

# 4. Run Delta Lakehouse Transformation
echo -e "\n${YELLOW}[Step 4/6] Writing Partitioned Delta Lake Table with ACID Log...${NC}"
python3 "$PROJECT_ROOT/src/transformation/delta_lakehouse.py"

# 5. Test Delta Time Travel
echo -e "\n${YELLOW}[Step 5/6] Verifying Delta Lake Time-Travel Snapshots & Commits...${NC}"
python3 "$PROJECT_ROOT/src/transformation/test_delta_timetravel.py"

# 6. Load Warehouse
echo -e "\n${YELLOW}[Step 6/7] Loading 50,000+ Rows into Star-Schema Data Warehouse...${NC}"
python3 "$PROJECT_ROOT/src/warehouse/loader.py"

# 7. Launch React UI
echo -e "\n${YELLOW}[Step 7/7] Launching DataForge Monitoring UI...${NC}"
if [ -d "$PROJECT_ROOT/ui" ]; then
    cd "$PROJECT_ROOT/ui"
    echo -e "${GREEN}DataForge is ready! Starting dev server at http://localhost:5173 ...${NC}"
    npm run dev
fi
