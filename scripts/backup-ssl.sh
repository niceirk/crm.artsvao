#!/bin/bash

# =============================================================================
# ARTSVAO SSL Certificate Backup Script
# Скачивание SSL сертификатов с сервера в локальную директорию
# =============================================================================

set -e

# === КОНФИГУРАЦИЯ ===
SERVER_HOST="109.196.102.90"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/artsvao_deploy"
DEPLOY_PATH="/opt/artsvao"
DOMAIN="crm.artsvao.ru"

# === ЦВЕТА ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $*${NC}"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $*${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $*${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] $*${NC}"
}

# === SSH ФУНКЦИЯ ===
ssh_exec() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "$@"
}

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          SSL CERTIFICATE BACKUP                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Проверка SSH ключа
if [[ ! -f "$SSH_KEY" ]]; then
    error "SSH ключ не найден: $SSH_KEY"
    exit 1
fi

# Проверка подключения
log "Подключение к серверу..."
if ! ssh_exec "echo 'OK'" >/dev/null 2>&1; then
    error "Не удалось подключиться к серверу"
    exit 1
fi

# Проверка наличия сертификатов на сервере
log "Проверка сертификатов на сервере..."
if ! ssh_exec "test -d $DEPLOY_PATH/certbot/conf/live/$DOMAIN"; then
    error "Сертификаты не найдены на сервере"
    warn "Запустите: bash scripts/init-ssl.sh"
    exit 1
fi

# Создание локальной директории
log "Создание локальной директории..."
mkdir -p ./certbot

# Скачивание сертификатов
log "Скачивание SSL сертификатов..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/certbot/conf/" \
    ./certbot/

# Проверка результата
if [[ -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]]; then
    success "SSL сертификаты успешно скачаны!"
    echo ""
    echo -e "Локальная директория: ${YELLOW}./certbot/${NC}"
    echo ""

    # Информация о сертификате
    log "Информация о сертификате:"
    openssl x509 -in ./certbot/conf/live/$DOMAIN/fullchain.pem -noout -dates 2>/dev/null || true
else
    error "Ошибка при скачивании сертификатов"
    exit 1
fi

echo ""
success "Бэкап завершён!"
echo ""
