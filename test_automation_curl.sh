#!/bin/bash

# Test Automation Enrollment with Immediate Processing
# This verifies that automations now process immediately after enrollment (like sequences)

# Configuration
if [ "$1" == "production" ]; then
    API_URL="https://loumassbeta.vercel.app/api"
    echo "🌐 Testing in PRODUCTION"
else
    API_URL="http://localhost:3000/api"
    echo "💻 Testing in DEVELOPMENT (use './test_automation_curl.sh production' for prod)"
fi

AUTOMATION_ID="cmf547j3e00018ol7r48wl3xg"  # Test Automation from CLAUDE.md

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing Automation Enrollment with Immediate Processing${NC}"
echo "================================================"

# Step 1: Get session cookie
echo -e "\n${YELLOW}Step 1: Session Setup${NC}"
echo "Please ensure you're logged into the app"
echo "Open browser DevTools > Application > Cookies and copy 'next-auth.session-token' value"
echo -n "Paste session token here: "
read SESSION_TOKEN

if [ -z "$SESSION_TOKEN" ]; then
    echo -e "${RED}❌ No session token provided. Exiting.${NC}"
    exit 1
fi

# Step 2: Get a test contact ID
echo -e "\n${YELLOW}Step 2: Getting test contact...${NC}"
CONTACT_RESPONSE=$(curl -s -X GET \
  "${API_URL}/contacts" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}")

# Extract first contact ID using grep and sed
CONTACT_ID=$(echo "$CONTACT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
CONTACT_EMAIL=$(echo "$CONTACT_RESPONSE" | grep -o '"email":"[^"]*"' | head -1 | sed 's/"email":"\([^"]*\)"/\1/')

if [ -z "$CONTACT_ID" ]; then
    echo -e "${RED}❌ No contacts found. Please create a contact first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found contact: ${CONTACT_EMAIL} (${CONTACT_ID})${NC}"

# Step 3: Enroll contact in automation
echo -e "\n${YELLOW}Step 3: Enrolling contact in automation...${NC}"
echo "Automation ID: ${AUTOMATION_ID}"

ENROLL_RESPONSE=$(curl -s -X POST \
  "${API_URL}/automations/${AUTOMATION_ID}/enroll" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"contactIds\":[\"${CONTACT_ID}\"]}")

echo "Response: $ENROLL_RESPONSE"

# Check if enrollment was successful
if echo "$ENROLL_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Contact enrolled successfully!${NC}"
else
    echo -e "${RED}❌ Enrollment failed${NC}"
    echo "$ENROLL_RESPONSE"
    exit 1
fi

# Step 4: Wait and check execution
echo -e "\n${YELLOW}Step 4: Waiting for immediate processing...${NC}"
echo "⏱️ Waiting 5 seconds for email to be sent..."
sleep 5

# Step 5: Check email interactions to see if email was sent
echo -e "\n${YELLOW}Step 5: Checking if email was sent immediately...${NC}"
INTERACTIONS_RESPONSE=$(curl -s -X GET \
  "${API_URL}/interactions?limit=10" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}")

# Check for recent email send to our contact
if echo "$INTERACTIONS_RESPONSE" | grep -q "$CONTACT_EMAIL"; then
    echo -e "${GREEN}✅ Email was sent to ${CONTACT_EMAIL}!${NC}"
    echo -e "${GREEN}🎉 SUCCESS: AUTOMATION IMMEDIATE PROCESSING IS WORKING!${NC}"
    SUCCESS=true
else
    echo -e "${YELLOW}⚠️ No email found for ${CONTACT_EMAIL} yet${NC}"
    SUCCESS=false
fi

# Step 6: Get automation stats
echo -e "\n${YELLOW}Step 6: Checking automation stats...${NC}"
STATS_RESPONSE=$(curl -s -X GET \
  "${API_URL}/automations/${AUTOMATION_ID}/stats" \
  -H "Cookie: next-auth.session-token=${SESSION_TOKEN}")

echo "Stats response (active/completed counts):"
echo "$STATS_RESPONSE" | grep -E '"currentlyActive"|"totalCompleted"|"totalEntered"' || echo "$STATS_RESPONSE"

# Final summary
echo -e "\n${YELLOW}═══════════════════════════════${NC}"
echo -e "${YELLOW}📝 TEST RESULTS SUMMARY:${NC}"
echo -e "${YELLOW}═══════════════════════════════${NC}"

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}✅ TEST PASSED!${NC}"
    echo -e "${GREEN}The automation processed immediately after enrollment.${NC}"
    echo -e "${GREEN}This matches the sequence behavior - no waiting for cron!${NC}"
else
    echo -e "${RED}❌ TEST FAILED or INCOMPLETE${NC}"
    echo -e "Possible issues:"
    echo -e "  1. Gmail token needs refresh (check server logs)"
    echo -e "  2. Email is still processing (wait more)"
    echo -e "  3. Check server logs for errors"
    echo -e ""
    echo -e "${YELLOW}Check server logs for:${NC}"
    echo -e "  • '🚀 Processing enrolled executions immediately...'"
    echo -e "  • '⚡ Processing execution for contact ${CONTACT_EMAIL}'"
fi

echo -e "\n${YELLOW}📍 Verify manually:${NC}"
echo -e "  1. Check interactions: ${API_URL%/api}/dashboard/interactions"
echo -e "  2. Check Gmail sent folder"
echo -e "  3. Check server console logs"
