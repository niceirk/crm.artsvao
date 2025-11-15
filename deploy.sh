#!/bin/bash

# ARTSVAO Deployment Script
# Deploys the application to production server

set -e

# Configuration
SERVER_HOST="109.196.102.90"
SERVER_USER="root"
SERVER_PASSWORD="gw7QDuYY#6Vwsc"
DEPLOY_PATH="/opt/artsvao"
PROJECT_NAME="artsvao"

echo "🚀 Starting deployment to $SERVER_HOST..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run SSH commands
ssh_exec() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "$@"
}

# Function to copy files using rsync
rsync_copy() {
    sshpass -p "$SERVER_PASSWORD" rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'dist' \
        --exclude 'logs' \
        --exclude '.env' \
        --exclude '.git' \
        --exclude 'test-db-connection.js' \
        "$@"
}

echo -e "${YELLOW}📦 Step 1: Creating deployment directory on server...${NC}"
ssh_exec "mkdir -p $DEPLOY_PATH"

echo -e "${YELLOW}📤 Step 2: Copying files to server...${NC}"
rsync_copy ./ "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

echo -e "${YELLOW}🔐 Step 3: Setting up environment variables...${NC}"
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no .env.production "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/.env"

echo -e "${YELLOW}🐳 Step 4: Building Docker containers...${NC}"
ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml build --no-cache"

echo -e "${YELLOW}🔄 Step 5: Running database migrations...${NC}"
echo -e "Starting database for migrations..."
ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml up -d postgres"
sleep 5
echo -e "Running migrations..."
ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy" || {
    echo -e "${RED}❌ Migration failed! Check logs above.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Migrations completed successfully${NC}"

echo -e "${YELLOW}🚀 Step 6: Starting all services...${NC}"
ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml down || true"
ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml up -d"

echo -e "${YELLOW}⏳ Step 7: Waiting for services to start...${NC}"
sleep 15

echo -e "${YELLOW}🔍 Step 8: Checking service status...${NC}"
ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml ps"

echo -e "${YELLOW}📋 Step 9: Checking backend logs...${NC}"
ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml logs --tail=20 backend" || true

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application should be available at: http://$SERVER_HOST${NC}"
echo -e "${GREEN}🌐 Or at: http://crm.artsvao.ru (if DNS is configured)${NC}"
echo ""
echo -e "${YELLOW}📝 Useful commands:${NC}"
echo -e "  View logs: sshpass -p '$SERVER_PASSWORD' ssh $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml logs -f'"
echo -e "  Restart:   sshpass -p '$SERVER_PASSWORD' ssh $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml restart'"
echo -e "  Stop:      sshpass -p '$SERVER_PASSWORD' ssh $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml down'"
