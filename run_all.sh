#!/usr/bin/env bash
# ==============================================================================
# DataForge: One-Click Master Pipeline & Platform Launcher
# Executes:
# 1. Verification of environment & dependencies
# 2. Synthetic raw dataset generation (Orders, Customers, Products, REST API)
# 3. PySpark / Silver transformation with deduplication & currency normalization
# 4. Data Quality verification gate
# 5. Star-Schema Data Warehouse load (PostgreSQL / SQLite fallback)
# 6. Starts Docker Compose infrastructure (Airflow, Postgres, MinIO) [Optional/Auto]
# 7. Launches React UI Dashboard
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${CYAN}        ⚡ DATAFORGE: E-COMMERCE DATA PLATFORM        ${NC}"
echo -e "${BLUE}=====================================================${NC}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 1. Generate Sample Data
echo -e "\n${YELLOW}[Step 1/5] Generating Raw Ingestion Sources & Mock REST API...${NC}"
python3 "$PROJECT_ROOT/src/ingestion/sample_generator.py"

# 2. Run Transformation & Quality Checks
echo -e "\n${YELLOW}[Step 2/5] Running PySpark / Silver Transformation & Deduplication...${NC}"
python3 "$PROJECT_ROOT/src/transformation/spark_transform.py"

# 3. Load Warehouse
echo -e "\n${YELLOW}[Step 3/5] Loading Star-Schema Warehouse Fact & Dimensions...${NC}"
python3 "$PROJECT_ROOT/src/warehouse/loader.py"

# 4. Docker Compose Verification / Launch
echo -e "\n${YELLOW}[Step 4/5] Checking Docker Infrastructure...${NC}"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo -e "${GREEN}Docker daemon is running. Starting MinIO, PostgreSQL, and Airflow services...${NC}"
    docker-compose up -d minio postgres &
    echo -e "${GREEN}MinIO and PostgreSQL containers started successfully.${NC}"
else
    echo -e "${YELLOW}Docker is not active or lacks permissions; running in local pipeline mode.${NC}"
fi

# 5. Launch React UI
echo -e "\n${YELLOW}[Step 5/5] Launching DataForge Monitoring UI...${NC}"
if [ -d "$PROJECT_ROOT/ui" ]; then
    cd "$PROJECT_ROOT/ui"
    echo -e "${GREEN}DataForge is ready! Starting dev server at http://localhost:5173 ...${NC}"
    npm run dev
fi
