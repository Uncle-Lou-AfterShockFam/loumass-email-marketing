#!/bin/bash

# Comprehensive test script for LOUMASS cron jobs and processing
# This script tests all the main processing endpoints

echo "🚀 LOUMASS COMPREHENSIVE PROCESSING TEST"
echo "========================================"
echo "Time: $(date)"
echo ""

# Read CRON_SECRET from user input if not set
if [ -z "$CRON_SECRET" ]; then
    echo "⚠️  CRON_SECRET environment variable not set!"
    echo "Please enter your CRON_SECRET from Vercel:"
    read -s CRON_SECRET
    echo ""
fi

# Test functions
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="$3"
    local auth_header="$4"
    
    echo "Testing $name..."
    echo "URL: $url"
    
    if [ "$method" = "POST" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -X POST "$url" -H "$auth_header" -H "Content-Type: application/json" 2>/dev/null)
        else
            response=$(curl -s -X POST "$url" -H "Content-Type: application/json" 2>/dev/null)
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s "$url" -H "$auth_header" 2>/dev/null)
        else
            response=$(curl -s "$url" 2>/dev/null)
        fi
    fi
    
    # Check if response contains success indicators
    if echo "$response" | grep -q '"success":true\|"message".*success\|"timestamp"' 2>/dev/null; then
        echo "✅ SUCCESS: $response" | head -c 200
        echo "..."
    elif echo "$response" | grep -q '"error"' 2>/dev/null; then
        echo "❌ ERROR: $response" | head -c 200 
        echo "..."
    else
        echo "❓ UNKNOWN: $response" | head -c 200
        echo "..."
    fi
    echo ""
}

BASE_URL="https://loumassbeta.vercel.app"
AUTH_HEADER="Authorization: Bearer $CRON_SECRET"

echo "1. MANUAL PROCESSING TESTS (No Auth Required)"
echo "---------------------------------------------------"
test_endpoint "Manual Automation Execution" "$BASE_URL/api/automations/trigger-manual" "POST" ""
test_endpoint "Manual Automation Process" "$BASE_URL/api/automations/execute" "POST" ""

echo ""
echo "2. CRON JOB TESTS (Requires CRON_SECRET)"
echo "---------------------------------------------------"
test_endpoint "Process Campaigns Cron" "$BASE_URL/api/cron/process-campaigns" "GET" "$AUTH_HEADER"
test_endpoint "Process Sequences Cron" "$BASE_URL/api/cron/process-sequences" "GET" "$AUTH_HEADER" 
test_endpoint "Automation Scheduler Cron" "$BASE_URL/api/cron/automation-scheduler" "GET" "$AUTH_HEADER"

echo ""
echo "3. CRON JOB TESTS (POST Method)"
echo "---------------------------------------------------" 
test_endpoint "Automation Scheduler POST" "$BASE_URL/api/cron/automation-scheduler" "POST" "$AUTH_HEADER"

echo ""
echo "✅ Testing completed! Check the results above."
echo "📝 If you see SUCCESS messages, the system is working!"
echo "📝 If you see ERROR messages, there may be configuration issues."
echo ""
