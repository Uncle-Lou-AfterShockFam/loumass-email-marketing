#!/bin/bash

# Manual Cron Job Trigger Script
# This triggers the cron jobs manually to process sequences and automations

# Configuration
if [ "$1" == "production" ]; then
    API_URL="https://loumassbeta.vercel.app/api"
    echo "🌐 Triggering PRODUCTION cron jobs"
else
    API_URL="http://localhost:3000/api"
    echo "💻 Triggering LOCAL cron jobs (use './trigger_crons.sh production' for prod)"
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Manual Cron Job Trigger${NC}"
echo "================================"

# Function to trigger a cron job
trigger_cron() {
    local endpoint=$1
    local name=$2
    
    echo -e "\n${YELLOW}Triggering ${name}...${NC}"
    
    response=$(curl -s -X POST "${API_URL}${endpoint}" \
        -H "Content-Type: application/json")
    
    if echo "$response" | grep -q "success.*true"; then
        echo -e "${GREEN}✅ ${name} triggered successfully${NC}"
        echo "$response" | grep -E '"processed"|"enrolled"|"sent"|"result"' || echo "$response"
    else
        echo -e "${RED}❌ ${name} failed${NC}"
        echo "$response"
    fi
}

# Trigger sequence processor
trigger_cron "/cron/sequences" "Sequence Processor"

# Trigger automation scheduler
trigger_cron "/cron/automation-scheduler" "Automation Scheduler"

# Also trigger the old automation execute endpoint if it exists
echo -e "\n${YELLOW}Triggering legacy automation executor...${NC}"
curl -s -X POST "${API_URL}/automations/execute" \
    -H "Content-Type: application/json" \
    -H "x-cron-secret: manual-trigger" | grep -E '"success"|"error"' || echo "No response"

echo -e "\n${GREEN}═════════════════════════════════${NC}"
echo -e "${GREEN}✅ All cron jobs triggered!${NC}"
echo -e "${GREEN}═════════════════════════════════${NC}"

echo -e "\n${YELLOW}📍 Next steps:${NC}"
echo "1. Check sequences: ${API_URL%/api}/dashboard/sequences"
echo "2. Check automations: ${API_URL%/api}/dashboard/automations"
echo "3. Check interactions: ${API_URL%/api}/dashboard/interactions"
echo "4. Check server logs for processing details"