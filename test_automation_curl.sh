#!/bin/bash

# Test script to manually trigger automation processing
# This bypasses the cron job authentication and directly tests the automation execution

echo "🧪 Testing LOUMASS Automation Processing..."
echo "Time: $(date)"
echo ""

# Test automation execution endpoint
echo "1. Testing Automation Execution..."
curl -s -X POST "https://loumassbeta.vercel.app/api/automations/trigger-manual" \
  -H "Content-Type: application/json" | jq '.' || echo "Failed - check if jq is installed"

echo ""
echo "2. Testing Sequence Processing..."
curl -s -X POST "https://loumassbeta.vercel.app/api/sequences/process-manual" \
  -H "Content-Type: application/json" | jq '.' || echo "Manual processing endpoint may not exist"

echo ""
echo "Done! Check the output above for any errors."
