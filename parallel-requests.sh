#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================"
echo "   Starting API Requests"
echo "================================"
echo ""

# Function to run curl and track its status
run_request() {
    local name=$1
    local url=$2
    local method=$3
    local data=$4
    
    echo -e "${YELLOW}⏳ [$method]${NC} $name - ${BLUE}PENDING${NC}"
    
    if [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" --data-raw "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
        echo -e "${GREEN}✓ [$method]${NC} $name - ${GREEN}COMPLETED${NC} (HTTP $http_code)"
    else
        echo -e "${RED}✗ [$method]${NC} $name - ${RED}FAILED${NC} (HTTP $http_code)"
    fi
    
    # Optionally print response body (truncated)
    # echo "$body" | head -c 200
}

# Launch POST request in background
run_request "Create Workload" \
    "http://localhost:50018/api/v1beta/workloads" \
    "POST" \
    '{"name":"everything-2","image":"docker.io/mcp/everything:latest","transport":"stdio","env_vars":{},"secrets":[],"cmd_arguments":[],"network_isolation":false,"volumes":[],"group":"default"}' &
pid1=$!

# Launch GET requests in background
run_request "Health Check" \
    "http://localhost:50018/health" \
    "GET" \
    "" &
pid2=$!

run_request "List Workloads" \
    "http://localhost:50018/api/v1beta/workloads?all=true&group=default" \
    "GET" \
    "" &
pid3=$!

# Wait for all background jobs to complete
wait $pid1 $pid2 $pid3

echo ""
echo "================================"
echo "   All Requests Completed"
echo "================================"

