#!/bin/bash

echo "=== FULL END-TO-END AUTOMATION TEST ==="
echo "Testing with: lou@soberafe.com"
echo "Base URL: https://loumassbeta.vercel.app"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"

BASE_URL="https://loumassbeta.vercel.app"
TEST_EMAIL="lou@soberafe.com"

echo ""
echo "🔨 STEP 1: Creating test automation..."

# Create automation data
AUTOMATION_JSON='{
  "name": "FULL TEST AUTOMATION - Email Tracking",
  "description": "End-to-end test of automation email tracking system", 
  "triggerEvent": "MANUAL",
  "status": "ACTIVE",
  "trackingEnabled": true,
  "nodes": {
    "nodes": [
      {
        "id": "trigger-test-123",
        "type": "trigger",
        "name": "Manual Trigger", 
        "position": {"x": 50, "y": 100},
        "data": {"label": "Start", "triggerType": "MANUAL"}
      },
      {
        "id": "email-test-123",
        "type": "email",
        "name": "Test Email",
        "position": {"x": 300, "y": 100},
        "emailTemplate": {
          "subject": "TEST: Automation Email Tracking",
          "content": "Hi {{firstName}},\\n\\nThis is a test email from the automation system.\\n\\nPlease click this link to test click tracking: [Test Link](https://loumassbeta.vercel.app/dashboard)\\n\\nBest regards,\\nLOUMASS Team",
          "trackingEnabled": true
        }
      }
    ],
    "edges": [
      {
        "id": "trigger-to-email",
        "source": "trigger-test-123", 
        "target": "email-test-123",
        "type": "smoothstep"
      }
    ]
  }
}'

echo "Sending POST to /api/automations..."
CREATE_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/automations" \
  -H "Content-Type: application/json" \
  -d "$AUTOMATION_JSON")

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Create status: $HTTP_STATUS"
echo "Create response: ${RESPONSE_BODY:0:200}..."

if [ "$HTTP_STATUS" = "401" ]; then
  echo "❌ FAILED: Authentication required"
  echo "💡 This test needs authentication. Testing public endpoints instead..."
  
  echo ""
  echo "🔍 STEP 2: Testing health endpoint..."
  curl -s "$BASE_URL/api/health" | head -3
  
  echo ""  
  echo "🔍 STEP 3: Testing existing automation..."
  curl -s "$BASE_URL/api/automations/cmfbhe7sp0002jt048p8jux6p" | head -5
  
  echo ""
  echo "💡 MANUAL TEST STEPS:"
  echo "1. Go to https://loumassbeta.vercel.app/dashboard/automations/new"
  echo "2. Create automation with:"
  echo "   - Name: 'TEST: End-to-End Email Tracking'"
  echo "   - Trigger: Manual" 
  echo "   - Email: Subject 'TEST Email', content with tracking link"
  echo "3. Activate the automation"
  echo "4. Enroll contact: $TEST_EMAIL"
  echo "5. Check if email is received and tracked"
  
  exit 1
fi

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Failed to create automation: $HTTP_STATUS"
  exit 1
fi

# Extract automation ID from response
AUTOMATION_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Created automation: $AUTOMATION_ID"

echo ""
echo "🔍 STEP 2: Verifying automation structure..."
GET_RESPONSE=$(curl -s "$BASE_URL/api/automations/$AUTOMATION_ID")
echo "Get response: ${GET_RESPONSE:0:200}..."

echo ""
echo "👤 STEP 3: Enrolling test contact..."
ENROLL_JSON="{\"contactEmails\": [\"$TEST_EMAIL\"]}"

ENROLL_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/automations/$AUTOMATION_ID/enroll" \
  -H "Content-Type: application/json" \
  -d "$ENROLL_JSON")

ENROLL_STATUS=$(echo "$ENROLL_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
ENROLL_BODY=$(echo "$ENROLL_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Enroll status: $ENROLL_STATUS"
echo "Enroll response: $ENROLL_BODY"

echo ""
echo "⚡ STEP 4: Triggering automation execution..."
TRIGGER_JSON="{\"automationId\": \"$AUTOMATION_ID\"}"

TRIGGER_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/automations/trigger-manual" \
  -H "Content-Type: application/json" \
  -d "$TRIGGER_JSON")

TRIGGER_STATUS=$(echo "$TRIGGER_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
TRIGGER_BODY=$(echo "$TRIGGER_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Trigger status: $TRIGGER_STATUS" 
echo "Trigger response: $TRIGGER_BODY"

echo ""
echo "📊 STEP 5: Checking automation stats..."
STATS_RESPONSE=$(curl -s "$BASE_URL/api/automations/$AUTOMATION_ID/stats")
echo "Stats response: ${STATS_RESPONSE:0:200}..."

echo ""
echo "🎯 SUMMARY:"
echo "Test automation ID: $AUTOMATION_ID"
echo "Test contact: $TEST_EMAIL"
echo "Next: Check email inbox and automation analytics"
echo "Manual cleanup: Delete test automation if needed"