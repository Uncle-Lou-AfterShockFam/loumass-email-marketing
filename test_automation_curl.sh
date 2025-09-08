#!/bin/bash

echo "🚀 Testing Automation Manual Trigger with Token Refresh"
echo "=========================================="
echo ""

# API endpoint
API_URL="https://loumassbeta.vercel.app/api/automations/cmfbhe7sp0002jt048p8jux6p/trigger-manual"

echo "📍 Endpoint: $API_URL"
echo ""
echo "📧 Triggering automation for lou@soberafe.com..."
echo ""

# Make the API call
response=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "contactEmails": ["lou@soberafe.com"],
    "testMode": true
  }')

echo "📨 Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""
echo "✅ Test complete! Check:"
echo "1. Email inbox for new message"
echo "2. Analytics tab at https://loumassbeta.vercel.app/dashboard/automations/cmfbhe7sp0002jt048p8jux6p"
echo "3. The Gmail token should have auto-refreshed"
