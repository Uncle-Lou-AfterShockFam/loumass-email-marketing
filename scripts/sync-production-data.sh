#!/bin/bash

# 🔄 LOUMASS PRODUCTION DATA SYNC SCRIPT
# Safely copies production data to local development (with sensitive data scrubbed)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 LOUMASS PRODUCTION DATA SYNC${NC}"
echo -e "${BLUE}=================================${NC}"

# Check required environment variables
if [ -z "$PRODUCTION_DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: PRODUCTION_DATABASE_URL not set${NC}"
    echo -e "${YELLOW}Set it with: export PRODUCTION_DATABASE_URL=\"<neon-database-url>\"${NC}"
    exit 1
fi

if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: LOCAL_DATABASE_URL not set${NC}"
    echo -e "${YELLOW}Set it with: export LOCAL_DATABASE_URL=\"postgresql://localhost:5432/loumass_beta\"${NC}"
    exit 1
fi

# Confirmation prompt
echo -e "${YELLOW}⚠️  This will REPLACE your local development database with production data${NC}"
echo -e "${YELLOW}⚠️  Sensitive data (passwords, tokens) will be scrubbed for security${NC}"
echo -n -e "${BLUE}Continue? [y/N]: ${NC}"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Operation cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}📊 Step 1: Creating production backup...${NC}"

# Create temporary backup
TEMP_BACKUP="/tmp/loumass_prod_sync_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$PRODUCTION_DATABASE_URL" > "$TEMP_BACKUP"
echo -e "${GREEN}✅ Production backup created${NC}"

echo -e "${YELLOW}🧹 Step 2: Scrubbing sensitive data...${NC}"

# Create scrubbed version
SCRUBBED_BACKUP="/tmp/loumass_scrubbed_$(date +%Y%m%d_%H%M%S).sql"
cp "$TEMP_BACKUP" "$SCRUBBED_BACKUP"

# Scrub sensitive data using sed
sed -i.bak "s/'GOCSPX-[^']*'/'GOCSPX-LOCAL-DEV-SECRET'/g" "$SCRUBBED_BACKUP"  # Google Client Secrets
sed -i.bak "s/'sk_[^']*'/'sk_LOCAL_DEV_KEY'/g" "$SCRUBBED_BACKUP"  # Stripe keys
sed -i.bak "s/'npg_[^']*'/'npg_LOCAL_DEV_PASSWORD'/g" "$SCRUBBED_BACKUP"  # Neon passwords
sed -i.bak "s/accessToken = '[^']*'/accessToken = 'LOCAL_DEV_TOKEN'/g" "$SCRUBBED_BACKUP"  # OAuth tokens
sed -i.bak "s/refreshToken = '[^']*'/refreshToken = 'LOCAL_DEV_REFRESH'/g" "$SCRUBBED_BACKUP"  # Refresh tokens

echo -e "${GREEN}✅ Sensitive data scrubbed${NC}"

echo -e "${YELLOW}🗄️ Step 3: Dropping local database...${NC}"
dropdb --if-exists loumass_beta
createdb loumass_beta
echo -e "${GREEN}✅ Local database reset${NC}"

echo -e "${YELLOW}📥 Step 4: Importing production data...${NC}"
psql "$LOCAL_DATABASE_URL" < "$SCRUBBED_BACKUP"
echo -e "${GREEN}✅ Production data imported to local${NC}"

echo -e "${YELLOW}🧽 Step 5: Cleaning up temporary files...${NC}"
rm -f "$TEMP_BACKUP" "$SCRUBBED_BACKUP" "$SCRUBBED_BACKUP.bak"
echo -e "${GREEN}✅ Cleanup completed${NC}"

echo ""
echo -e "${GREEN}🎉 Production data sync completed successfully!${NC}"
echo -e "${BLUE}💡 Your local database now has production data (with sensitive info scrubbed)${NC}"
echo -e "${BLUE}💡 You can now test with real data structures safely${NC}"
echo ""