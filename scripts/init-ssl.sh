#!/bin/bash

# =============================================================================
# ARTSVAO SSL Certificate Initialization Script
# Инициализация Let's Encrypt SSL сертификатов для нового сервера
# =============================================================================

set -e

# === КОНФИГУРАЦИЯ ===
SERVER_HOST="109.196.102.90"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/artsvao_deploy"
DEPLOY_PATH="/opt/artsvao"
DOMAIN="crm.artsvao.ru"
EMAIL="admin@artsvao.ru"

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
echo -e "${BLUE}║          SSL CERTIFICATE INITIALIZATION                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Домен: ${YELLOW}$DOMAIN${NC}"
echo -e "Email: ${YELLOW}$EMAIL${NC}"
echo ""

# Проверка SSH ключа
if [[ ! -f "$SSH_KEY" ]]; then
    error "SSH ключ не найден: $SSH_KEY"
    echo "Сначала настройте SSH ключи (см. README)"
    exit 1
fi

# Проверка подключения
log "Проверка подключения к серверу..."
if ! ssh_exec "echo 'OK'" >/dev/null 2>&1; then
    error "Не удалось подключиться к серверу"
    exit 1
fi
success "Подключение установлено"

# Шаг 1: Создание директорий
log "Создание директорий для сертификатов..."
ssh_exec "
    mkdir -p $DEPLOY_PATH/certbot/conf
    mkdir -p $DEPLOY_PATH/certbot/www/.well-known/acme-challenge
"

# Шаг 2: Создание временного самоподписанного сертификата
log "Создание временного самоподписанного сертификата..."
ssh_exec "
    mkdir -p $DEPLOY_PATH/certbot/conf/live/$DOMAIN

    # Генерируем самоподписанный сертификат
    openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
        -keyout $DEPLOY_PATH/certbot/conf/live/$DOMAIN/privkey.pem \
        -out $DEPLOY_PATH/certbot/conf/live/$DOMAIN/fullchain.pem \
        -subj '/CN=$DOMAIN' 2>/dev/null

    # Создаём символические ссылки (certbot создаёт такую структуру)
    cp $DEPLOY_PATH/certbot/conf/live/$DOMAIN/fullchain.pem $DEPLOY_PATH/certbot/conf/live/$DOMAIN/cert.pem
    cp $DEPLOY_PATH/certbot/conf/live/$DOMAIN/fullchain.pem $DEPLOY_PATH/certbot/conf/live/$DOMAIN/chain.pem

    echo 'Временный сертификат создан'
"
success "Временный сертификат создан"

# Шаг 3: Запуск nginx с временным сертификатом
log "Запуск nginx с временным сертификатом..."
ssh_exec "
    cd $DEPLOY_PATH

    # Останавливаем всё
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true

    # Запускаем только nginx
    docker compose -f docker-compose.prod.yml up -d nginx

    # Ждём запуска
    sleep 5
"
success "Nginx запущен"

# Шаг 4: Проверка доступности домена
log "Проверка доступности домена..."
if ! curl -sf "http://$DOMAIN/.well-known/acme-challenge/test" --connect-timeout 5 >/dev/null 2>&1; then
    warn "Домен $DOMAIN не отвечает на HTTP"
    warn "Убедитесь, что DNS настроен и указывает на $SERVER_HOST"
    warn ""
    warn "Проверьте DNS:"
    warn "  nslookup $DOMAIN"
    warn "  dig $DOMAIN"
    warn ""
    echo -e "${YELLOW}Продолжить получение сертификата? (y/n)${NC}"
    read -r answer
    if [[ "$answer" != "y" ]]; then
        echo "Отменено"
        exit 1
    fi
fi

# Шаг 5: Получение настоящего сертификата через certbot
log "Получение сертификата Let's Encrypt..."
echo ""
warn "ВНИМАНИЕ: Let's Encrypt имеет лимит 5 сертификатов в неделю для домена!"
warn "Если вы уже получали сертификат сегодня, может быть отказ."
echo ""

ssh_exec "
    cd $DEPLOY_PATH

    # Запускаем certbot для получения сертификата
    docker run --rm \
        -v $DEPLOY_PATH/certbot/conf:/etc/letsencrypt \
        -v $DEPLOY_PATH/certbot/www:/var/www/certbot \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d $DOMAIN
"

# Проверка результата
if ssh_exec "test -f $DEPLOY_PATH/certbot/conf/live/$DOMAIN/fullchain.pem"; then
    success "SSL сертификат успешно получен!"
else
    error "Не удалось получить SSL сертификат"
    warn "Проверьте логи выше для диагностики"
    exit 1
fi

# Шаг 6: Перезапуск nginx
log "Перезапуск nginx с настоящим сертификатом..."
ssh_exec "
    cd $DEPLOY_PATH
    docker compose -f docker-compose.prod.yml restart nginx
"

# Шаг 7: Проверка HTTPS
log "Проверка HTTPS..."
sleep 3

if curl -sf "https://$DOMAIN" --connect-timeout 10 >/dev/null 2>&1; then
    success "HTTPS работает!"
else
    warn "HTTPS пока не отвечает, но сертификат получен"
    warn "Возможно, нужно подождать несколько минут"
fi

# Шаг 8: Скачивание сертификатов локально
log "Скачивание сертификатов в локальную директорию..."
mkdir -p ./certbot/conf/live/$DOMAIN

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/certbot/conf/" \
    ./certbot/ 2>/dev/null || warn "Не удалось скачать сертификаты локально"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║          ✅ SSL СЕРТИФИКАТЫ НАСТРОЕНЫ!                     ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Домен:     ${YELLOW}https://$DOMAIN${NC}"
echo -e "Срок:      ${YELLOW}90 дней (авто-обновление через certbot)${NC}"
echo ""
echo -e "${BLUE}Следующие шаги:${NC}"
echo "  1. Запустите полный деплой: bash deploy-unified.sh"
echo "  2. Сертификаты будут автоматически обновляться через certbot контейнер"
echo ""
