#!/usr/bin/env bash
# ==============================================================================
# DataForge: One-Click Master Pipeline & Platform Launcher
# Executes:
# 1. 50,000+ Enterprise Data Generation (Orders, Customers, Products, REST API)
# 2. Delta Lakehouse ACID Ingestion & Partitioning via Delta-RS
# 3. Time-Travel & ACID Transaction Verification
# 4. Star-Schema Data Warehouse Batch Load (PostgreSQL / SQLite)
# 5. Starts Docker Compose infrastructure (PostgreSQL on 5433, MinIO S3 on 9000/9001)
# 6. Launches React UI Dashboard
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

# 1. Generate 50,000+ Records
echo -e "\n${YELLOW}[Step 1/5] Generating 50,000+ Ingestion Records & Mock REST API...${NC}"
python3 "$PROJECT_ROOT/src/ingestion/sample_generator.py"

# 2. Run Delta Lakehouse Transformation
echo -e "\n${YELLOW}[Step 2/5] Writing Partitioned Delta Lake Table with ACID Log...${NC}"
python3 "$PROJECT_ROOT/src/transformation/delta_lakehouse.py"

# 3. Test Delta Time Travel
echo -e "\n${YELLOW}[Step 3/5] Verifying Delta Lake Time-Travel Snapshots & Commits...${NC}"
python3 "$PROJECT_ROOT/src/transformation/test_delta_timetravel.py"

# 4. Load Warehouse
echo -e "\n${YELLOW}[Step 4/5] Loading 50,000+ Rows into Star-Schema Data Warehouse...${NC}"
python3 "$PROJECT_ROOT/src/warehouse/loader.py"

# 5. Docker Infrastructure
echo -e "\n${YELLOW}[Step 5/6] Checking Docker Infrastructure...${NC}"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo -e "${GREEN}Starting MinIO S3 and PostgreSQL containers...${NC}"
    docker-compose up -d minio postgres &
    echo -e "${GREEN}Containers initializing: MinIO (9001) | Postgres (5433)${NC}"
else
    echo -e "${YELLOW}Docker is not active; running in local pipeline mode.${NC}"
fi

# 6. Launch React UI
echo -e "\n${YELLOW}[Step 6/6] Launching DataForge Monitoring UI...${NC}"
if [ -d "$PROJECT_ROOT/ui" ]; then
    cd "$PROJECT_ROOT/ui"
    echo -e "${GREEN}DataForge is ready! Starting dev server at http://localhost:5173 ...${NC}"
    npm run dev
fi
