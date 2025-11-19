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

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_CHECKS=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        -h|--help)
            echo "Использование: $0 [опции]"
            echo ""
            echo "Опции:"
            echo "  --skip-checks    Пропустить pre-deploy проверки"
            echo "  -h, --help       Показать эту справку"
            exit 0
            ;;
        *)
            echo "Неизвестная опция: $1"
            echo "Используйте -h или --help для справки"
            exit 1
            ;;
    esac
done

echo "🚀 Starting deployment to $SERVER_HOST..."

# Step 0: Pre-deployment checks
if [ "$SKIP_CHECKS" = false ]; then
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   📋 STEP 0: PRE-DEPLOYMENT CHECKS        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Проверяем готовность к деплою:${NC}"
    echo -e "  • Проверка переменных окружения"
    echo -e "  • Проверка docker-compose конфигурации"
    echo -e "  • Проверка зависимостей проекта"
    echo -e "  • Проверка наличия всех необходимых файлов"
    echo ""

    if [ -f "./pre-deploy-check.sh" ]; then
        if bash ./pre-deploy-check.sh --skip-connection-checks; then
            echo ""
            echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║   ✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!       ║${NC}"
            echo -e "${GREEN}║   Можно продолжить деплой                 ║${NC}"
            echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
            echo ""
            sleep 2
        else
            echo ""
            echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
            echo -e "${RED}║   ❌ ПРОВЕРКИ НЕ ПРОЙДЕНЫ!                ║${NC}"
            echo -e "${RED}║   Деплой остановлен                        ║${NC}"
            echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
            echo ""
            echo -e "${YELLOW}💡 Что делать:${NC}"
            echo -e "  1. Исправьте ошибки, указанные выше"
            echo -e "  2. Запустите проверку заново: ${BLUE}bash pre-deploy-check.sh${NC}"
            echo -e "  3. После исправления запустите деплой снова: ${BLUE}bash deploy.sh${NC}"
            echo ""
            echo -e "${RED}⚠️  Вы можете пропустить проверки с флагом --skip-checks${NC}"
            echo -e "${RED}    НО ЭТО КРАЙНЕ НЕ РЕКОМЕНДУЕТСЯ!${NC}"
            echo ""
            exit 1
        fi
    else
        echo -e "${RED}❌ Файл pre-deploy-check.sh не найден!${NC}"
        echo -e "${YELLOW}Создайте его или скопируйте из репозитория${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║   ⚠️  ВНИМАНИЕ: ПРОВЕРКИ ПРОПУЩЕНЫ!       ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
    echo -e "${YELLOW}Pre-deployment checks пропущены (флаг --skip-checks)${NC}"
    echo -e "${RED}Это может привести к проблемам при деплое!${NC}"
    echo ""
    sleep 3
fi

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
