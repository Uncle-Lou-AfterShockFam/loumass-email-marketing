#!/bin/bash

# 🛡️ LOUMASS DATABASE BACKUP SCRIPT
# Automatically backs up production database to prevent data loss

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛡️ LOUMASS DATABASE BACKUP UTILITY${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if production DATABASE_URL is available
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable not found${NC}"
    echo -e "${YELLOW}Please set DATABASE_URL to your production Neon database${NC}"
    echo -e "${YELLOW}Example: export DATABASE_URL=\"postgresql://neondb_owner:pass@host/db\"${NC}"
    exit 1
fi

# Create backup directory
BACKUP_DIR="./database-backups"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/loumass_backup_$TIMESTAMP.sql"

echo -e "${YELLOW}📊 Starting database backup...${NC}"
echo -e "${BLUE}Source: Production Database${NC}"
echo -e "${BLUE}Destination: $BACKUP_FILE${NC}"

# Create database backup using pg_dump
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Database backup completed successfully!${NC}"
    
    # Show backup file info
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}📁 Backup file: $BACKUP_FILE${NC}"
    echo -e "${GREEN}📏 Size: $BACKUP_SIZE${NC}"
    
    # Keep only last 7 backups to save space
    cd "$BACKUP_DIR"
    ls -t loumass_backup_*.sql | tail -n +8 | xargs -r rm --
    REMAINING_BACKUPS=$(ls loumass_backup_*.sql | wc -l)
    echo -e "${GREEN}🗃️ Keeping $REMAINING_BACKUPS most recent backups${NC}"
    
else
    echo -e "${RED}❌ Database backup failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Backup process completed successfully!${NC}"
echo -e "${BLUE}💡 To restore from this backup:${NC}"
echo -e "${BLUE}   psql \$DATABASE_URL < $BACKUP_FILE${NC}"
echo ""