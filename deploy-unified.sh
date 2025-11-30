#!/bin/bash

# =============================================================================
# ARTSVAO Unified Deployment Script v2.0
# Надёжный скрипт деплоя с SSH ключами, валидацией и rollback
# =============================================================================

set -euo pipefail

# === КОНФИГУРАЦИЯ ===
SERVER_HOST="109.196.102.90"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/artsvao_deploy"
DEPLOY_PATH="/opt/artsvao"
BACKUP_PATH="/opt/artsvao-backups"
DOMAIN="crm.artsvao.ru"
LOG_FILE="./logs/deploy-$(date +%Y%m%d-%H%M%S).log"
LOCK_FILE="/tmp/artsvao-deploy.lock"

# === ЦВЕТА ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# === ПЕРЕМЕННЫЕ СОСТОЯНИЯ ===
ROLLBACK_NEEDED=false
CURRENT_BACKUP=""
DEPLOYMENT_STARTED=false

# === ФЛАГИ ОПТИМИЗАЦИИ ===
USE_NOCACHE=false
FAST_MODE=false

# === СОЗДАНИЕ ДИРЕКТОРИИ ЛОГОВ ===
mkdir -p ./logs

# === ФУНКЦИИ ЛОГИРОВАНИЯ ===
log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $*"
    echo -e "${BLUE}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

warn() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $*"
    echo -e "${YELLOW}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*"
    echo -e "${RED}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $*"
    echo -e "${GREEN}${msg}${NC}"
    echo "$msg" >> "$LOG_FILE"
}

section() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  $*${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# === SSH ФУНКЦИИ (ЧЕРЕЗ КЛЮЧИ) ===
ssh_exec() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "$@"
}

scp_secure() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$@"
}

rsync_copy() {
    # -a: архивный режим, -z: сжатие (опционально для близких серверов)
    # Убраны -v и --progress для ускорения
    rsync -az \
        -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'dist' \
        --exclude 'logs' \
        --exclude '.env' \
        --exclude '.env.production' \
        --exclude '.env.local' \
        --exclude '.git' \
        --exclude 'certbot' \
        --exclude '*.old' \
        --exclude '.tmp' \
        "$@"
}

# === ПРОВЕРКА SSH КЛЮЧА ===
check_ssh_key() {
    section "ПРОВЕРКА SSH КЛЮЧА"

    if [[ ! -f "$SSH_KEY" ]]; then
        error "SSH ключ не найден: $SSH_KEY"
        echo ""
        echo -e "${YELLOW}Создайте SSH ключ командами:${NC}"
        echo -e "  ssh-keygen -t ed25519 -f ~/.ssh/artsvao_deploy -C 'artsvao-deploy'"
        echo -e "  ssh-copy-id -i ~/.ssh/artsvao_deploy.pub root@$SERVER_HOST"
        echo ""
        return 1
    fi

    log "SSH ключ найден: $SSH_KEY"

    # Проверка подключения
    if ! ssh_exec "echo 'SSH connection OK'" 2>/dev/null; then
        error "Не удалось подключиться к серверу через SSH ключ"
        echo ""
        echo -e "${YELLOW}Скопируйте ключ на сервер:${NC}"
        echo -e "  ssh-copy-id -i ${SSH_KEY}.pub root@$SERVER_HOST"
        echo ""
        return 1
    fi

    success "SSH подключение работает"
}

# === PRE-VALIDATION ===
pre_validation() {
    section "PHASE 1: PRE-VALIDATION"

    local errors=0

    # Проверка .env.production
    if [[ ! -f ".env.production" ]]; then
        error "Файл .env.production не найден"
        ((errors++))
    else
        log "Файл .env.production найден"

        # Проверка критических переменных
        local required_vars=("DATABASE_URL" "JWT_SECRET" "NEXT_PUBLIC_API_URL")
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" .env.production; then
                error "Отсутствует переменная: ${var}"
                ((errors++))
            fi
        done
    fi

    # Проверка docker-compose.prod.yml
    if [[ ! -f "docker-compose.prod.yml" ]]; then
        error "Файл docker-compose.prod.yml не найден"
        ((errors++))
    else
        log "Файл docker-compose.prod.yml найден"
    fi

    # Проверка Dockerfile'ов
    if [[ ! -f "backend/Dockerfile" ]]; then
        error "Файл backend/Dockerfile не найден"
        ((errors++))
    fi

    if [[ ! -f "frontend/Dockerfile" ]]; then
        error "Файл frontend/Dockerfile не найден"
        ((errors++))
    fi

    # Проверка nginx конфигурации
    if [[ ! -d "nginx" ]]; then
        error "Директория nginx не найдена"
        ((errors++))
    fi

    if [[ $errors -gt 0 ]]; then
        error "Pre-validation провалена с $errors ошибками"
        return 1
    fi

    success "Pre-validation пройдена успешно"
}

# === СОЗДАНИЕ БЭКАПА ===
create_backup() {
    section "PHASE 2: СОЗДАНИЕ БЭКАПА"

    CURRENT_BACKUP="backup-$(date +%Y%m%d-%H%M%S)"

    ssh_exec "
        mkdir -p $BACKUP_PATH

        if [[ -d $DEPLOY_PATH ]]; then
            echo 'Создание бэкапа...'

            # Бэкап .env.production
            if [[ -f $DEPLOY_PATH/.env.production ]]; then
                cp $DEPLOY_PATH/.env.production $BACKUP_PATH/${CURRENT_BACKUP}-env
                echo 'ENV файл сохранён'
            fi

            # Бэкап SSL сертификатов
            if [[ -d $DEPLOY_PATH/certbot/conf/live ]]; then
                mkdir -p $BACKUP_PATH/${CURRENT_BACKUP}-ssl
                cp -r $DEPLOY_PATH/certbot/conf/live $BACKUP_PATH/${CURRENT_BACKUP}-ssl/
                echo 'SSL сертификаты сохранены'
            fi

            # Сохраняем ID текущих docker images
            docker images --format '{{.Repository}}:{{.Tag}}' | grep artsvao > $BACKUP_PATH/${CURRENT_BACKUP}-images.txt 2>/dev/null || true

            # Записываем имя бэкапа
            echo '$CURRENT_BACKUP' > $BACKUP_PATH/latest-backup

            echo 'Бэкап создан: $CURRENT_BACKUP'
        else
            echo 'Первый деплой - бэкап не требуется'
        fi
    "

    success "Бэкап создан: $CURRENT_BACKUP"
}

# === БЭКАП SSL СЕРТИФИКАТОВ В ЛОКАЛЬНУЮ ПАПКУ ===
backup_ssl_local() {
    section "PHASE 3: БЭКАП SSL СЕРТИФИКАТОВ"

    # Создаём локальную директорию certbot
    mkdir -p ./certbot/conf/live/$DOMAIN

    # Проверяем наличие сертификатов на сервере
    if ssh_exec "test -d $DEPLOY_PATH/certbot/conf/live/$DOMAIN"; then
        log "Скачиваем SSL сертификаты с сервера..."

        # Скачиваем сертификаты
        scp_secure -r "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/certbot/conf/" ./certbot/ 2>/dev/null || {
            warn "Не удалось скачать сертификаты (возможно, первый деплой)"
        }

        if [[ -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]]; then
            success "SSL сертификаты сохранены локально в ./certbot/"
        else
            warn "SSL сертификаты не найдены на сервере"
        fi
    else
        warn "SSL сертификаты не настроены на сервере"
        echo -e "${YELLOW}После деплоя запустите: bash scripts/init-ssl.sh${NC}"
    fi
}

# === КОПИРОВАНИЕ ENV ФАЙЛОВ (АТОМАРНО) ===
deploy_env() {
    section "PHASE 4: НАСТРОЙКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ"

    log "Копирование .env.production на сервер..."

    # Атомарное копирование: сначала во временный файл, потом mv
    scp_secure .env.production "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/.env.production.tmp"

    ssh_exec "
        cd $DEPLOY_PATH
        mv .env.production.tmp .env.production
        chmod 600 .env.production
    "

    # Валидация на сервере
    if ssh_exec "test -f $DEPLOY_PATH/.env.production && test -s $DEPLOY_PATH/.env.production"; then
        success "Переменные окружения настроены"
    else
        error "Ошибка при копировании .env.production"
        return 1
    fi
}

# === СИНХРОНИЗАЦИЯ ФАЙЛОВ ===
sync_files() {
    section "PHASE 5: СИНХРОНИЗАЦИЯ ФАЙЛОВ"

    log "Создание директории на сервере..."
    ssh_exec "mkdir -p $DEPLOY_PATH"

    log "Копирование файлов проекта..."
    rsync_copy ./ "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

    # Копируем локальные SSL сертификаты если есть
    if [[ -d "./certbot/conf/live/$DOMAIN" ]]; then
        log "Копирование SSL сертификатов..."
        rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
            ./certbot/ "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/certbot/"
    fi

    success "Файлы синхронизированы"
}

# === ОСТАНОВКА СТАРЫХ КОНТЕЙНЕРОВ ===
stop_containers() {
    section "PHASE 6: ОСТАНОВКА СТАРЫХ КОНТЕЙНЕРОВ"

    ssh_exec "
        cd $DEPLOY_PATH
        docker compose -f docker-compose.prod.yml down || true
    " 2>/dev/null || true

    log "Старые контейнеры остановлены"
}

# === СБОРКА DOCKER ОБРАЗОВ ===
build_images() {
    section "PHASE 7: СБОРКА DOCKER ОБРАЗОВ"

    log "Запуск сборки Docker образов..."

    # Формируем команду сборки с BuildKit
    local build_cmd="export DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 && cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml build"

    if [[ "$USE_NOCACHE" == "true" ]]; then
        build_cmd="$build_cmd --no-cache"
        warn "Сборка с --no-cache (полная пересборка)"
    else
        log "Сборка с использованием кеша (быстрее)"
    fi

    if ! ssh_exec "$build_cmd"; then
        error "Ошибка сборки Docker образов"
        ROLLBACK_NEEDED=true
        return 1
    fi

    success "Docker образы собраны"
}

# === ПРОВЕРКА ГОТОВНОСТИ БД ===
wait_for_db() {
    local max_attempts=15  # Уменьшено с 30 до 15 (макс 30 сек)
    local attempt=1

    log "Ожидание готовности базы данных..."

    while [[ $attempt -le $max_attempts ]]; do
        if ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres" 2>/dev/null; then
            log "База данных готова (попытка $attempt)"
            return 0
        fi
        log "Попытка $attempt/$max_attempts: БД не готова, ждём..."
        sleep 2
        ((attempt++))
    done

    error "База данных не стала доступна за $max_attempts попыток"
    return 1
}

# === МИГРАЦИИ БД (ОДИН РАЗ, С LOCK) ===
run_migrations() {
    section "PHASE 8: МИГРАЦИИ БАЗЫ ДАННЫХ"

    # Создаём lock файл на сервере
    if ! ssh_exec "mkdir -p /tmp && (set -C; echo $$ > /tmp/artsvao-migration.lock) 2>/dev/null"; then
        error "Миграция уже выполняется (lock файл существует)"
        error "Если это ошибка, удалите: ssh root@$SERVER_HOST 'rm /tmp/artsvao-migration.lock'"
        return 1
    fi

    log "Lock файл создан"

    # Поднимаем postgres + backend вместе
    log "Запуск postgres и backend..."
    ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml up -d postgres backend"

    # Ждём готовности БД
    if ! wait_for_db; then
        ssh_exec "rm -f /tmp/artsvao-migration.lock"
        return 1
    fi

    log "Запуск миграций внутри уже запущенного backend..."

    # Используем exec вместо run --rm для ускорения (не создаём новый контейнер)
    if ! ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy"; then
        error "Миграция провалена!"
        ssh_exec "rm -f /tmp/artsvao-migration.lock"
        ROLLBACK_NEEDED=true
        return 1
    fi

    # Очищаем lock
    ssh_exec "rm -f /tmp/artsvao-migration.lock"

    success "Миграции выполнены успешно"
}

# === ЗАПУСК СЕРВИСОВ ===
start_services() {
    section "PHASE 9: ЗАПУСК СЕРВИСОВ"

    log "Запуск всех сервисов..."

    if ! ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml up -d"; then
        error "Ошибка запуска сервисов"
        ROLLBACK_NEEDED=true
        return 1
    fi

    success "Сервисы запущены"
}

# === HEALTH CHECKS ===
health_check() {
    section "PHASE 10: HEALTH CHECKS"

    # В fast mode уменьшаем количество попыток
    local max_attempts=10  # Уменьшено с 30 до 10
    local sleep_seconds=2  # Уменьшено с 3 до 2
    local attempt=1

    if [[ "$FAST_MODE" == "true" ]]; then
        max_attempts=5
        sleep_seconds=2
    fi

    # Ждём немного для инициализации
    sleep 5

    # Проверка backend
    log "Проверка backend..."
    while [[ $attempt -le $max_attempts ]]; do
        if ssh_exec "curl -sf http://localhost:3000/api/health" >/dev/null 2>&1; then
            success "Backend работает"
            break
        fi
        log "Попытка $attempt/$max_attempts: Backend не готов..."
        sleep $sleep_seconds
        ((attempt++))
    done

    if [[ $attempt -gt $max_attempts ]]; then
        warn "Backend health check не пройден (возможно, /api/health не существует)"
    fi

    # Проверка frontend
    attempt=1
    log "Проверка frontend..."
    while [[ $attempt -le $max_attempts ]]; do
        if ssh_exec "curl -sf http://localhost:3001" >/dev/null 2>&1; then
            success "Frontend работает"
            break
        fi
        log "Попытка $attempt/$max_attempts: Frontend не готов..."
        sleep $sleep_seconds
        ((attempt++))
    done

    if [[ $attempt -gt $max_attempts ]]; then
        warn "Frontend health check не пройден"
    fi

    # Проверка nginx (HTTPS)
    log "Проверка nginx/HTTPS..."
    if ssh_exec "curl -sf https://$DOMAIN --insecure" >/dev/null 2>&1; then
        success "Nginx HTTPS работает"
    else
        warn "Nginx HTTPS не отвечает - проверьте SSL сертификаты"
    fi

    # Показываем статус контейнеров
    log "Статус контейнеров:"
    ssh_exec "cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml ps"
}

# === ROLLBACK ===
rollback() {
    section "ОТКАТ ДЕПЛОЯ"

    error "Запуск отката..."

    local latest_backup=$(ssh_exec "cat $BACKUP_PATH/latest-backup 2>/dev/null || echo ''")

    if [[ -z "$latest_backup" ]]; then
        error "Бэкап для отката не найден!"
        return 1
    fi

    log "Откат к: $latest_backup"

    ssh_exec "
        # Останавливаем текущие контейнеры
        cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml down || true

        # Восстанавливаем env
        if [[ -f $BACKUP_PATH/${latest_backup}-env ]]; then
            cp $BACKUP_PATH/${latest_backup}-env $DEPLOY_PATH/.env.production
            echo 'ENV файл восстановлен'
        fi

        # Восстанавливаем SSL
        if [[ -d $BACKUP_PATH/${latest_backup}-ssl ]]; then
            mkdir -p $DEPLOY_PATH/certbot/conf
            cp -r $BACKUP_PATH/${latest_backup}-ssl/live $DEPLOY_PATH/certbot/conf/
            echo 'SSL сертификаты восстановлены'
        fi

        # Запускаем сервисы
        cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml up -d
    "

    warn "Откат завершён. Проверьте работу сервисов!"
}

# === CLEANUP ===
cleanup() {
    section "ОЧИСТКА"

    # В fast mode пропускаем очистку образов
    if [[ "$FAST_MODE" == "true" ]]; then
        warn "Очистка Docker образов пропущена (--fast режим)"
    else
        ssh_exec "
            # Удаляем неиспользуемые образы
            docker image prune -af --filter 'until=24h' || true
        " 2>/dev/null || true
    fi

    # Удаляем старые бэкапы (всегда)
    ssh_exec "
        cd $BACKUP_PATH 2>/dev/null && ls -t | tail -n +16 | xargs -r rm -rf || true
    " 2>/dev/null || true

    log "Очистка завершена"
}

# === ПОКАЗАТЬ РЕЗУЛЬТАТ ===
show_result() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║           ✅ ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО!                      ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "🌐 Приложение: ${CYAN}https://$DOMAIN${NC}"
    echo -e "📋 Лог деплоя: ${CYAN}$LOG_FILE${NC}"
    echo ""
    echo -e "${YELLOW}Полезные команды:${NC}"
    echo -e "  Логи:      ssh -i $SSH_KEY root@$SERVER_HOST 'cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml logs -f'"
    echo -e "  Перезапуск: ssh -i $SSH_KEY root@$SERVER_HOST 'cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml restart'"
    echo -e "  Статус:    ssh -i $SSH_KEY root@$SERVER_HOST 'cd $DEPLOY_PATH && docker compose -f docker-compose.prod.yml ps'"
    echo ""
}

# === ОБРАБОТКА ПРЕРЫВАНИЯ ===
trap_handler() {
    echo ""
    error "Деплой прерван!"

    if [[ "$ROLLBACK_NEEDED" == "true" ]] || [[ "$DEPLOYMENT_STARTED" == "true" ]]; then
        echo -e "${YELLOW}Выполнить откат? (y/n)${NC}"
        read -r answer
        if [[ "$answer" == "y" ]]; then
            rollback
        fi
    fi

    exit 1
}

trap trap_handler SIGINT SIGTERM

# === ПАРСИНГ АРГУМЕНТОВ ===
SKIP_CHECKS=false
SKIP_BACKUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --no-cache-build)
            USE_NOCACHE=true
            shift
            ;;
        --fast)
            FAST_MODE=true
            SKIP_BACKUP=true
            SKIP_CHECKS=true
            shift
            ;;
        -h|--help)
            echo "Использование: $0 [опции]"
            echo ""
            echo "Опции:"
            echo "  --skip-checks      Пропустить pre-deploy проверки"
            echo "  --skip-backup      Пропустить создание бэкапа"
            echo "  --no-cache-build   Собирать Docker образы с --no-cache (полная пересборка)"
            echo "  --fast             Быстрый режим: пропускает проверки, бэкапы и очистку образов"
            echo "  -h, --help         Показать справку"
            echo ""
            echo "Примеры:"
            echo "  $0                  Обычный деплой с кешем Docker"
            echo "  $0 --fast           Быстрый деплой для мелких изменений"
            echo "  $0 --no-cache-build Полная пересборка образов"
            exit 0
            ;;
        *)
            echo "Неизвестная опция: $1"
            exit 1
            ;;
    esac
done

# === ГЛАВНАЯ ФУНКЦИЯ ===
main() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}║          🚀 ARTSVAO UNIFIED DEPLOYMENT v2.1                ║${NC}"
    echo -e "${CYAN}║                                                            ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Сервер: ${CYAN}$SERVER_USER@$SERVER_HOST${NC}"
    echo -e "Путь:   ${CYAN}$DEPLOY_PATH${NC}"
    echo -e "Домен:  ${CYAN}$DOMAIN${NC}"

    # Показываем активные режимы
    if [[ "$FAST_MODE" == "true" ]]; then
        echo -e "Режим:  ${YELLOW}FAST (ускоренный деплой)${NC}"
    fi
    if [[ "$USE_NOCACHE" == "true" ]]; then
        echo -e "Сборка: ${YELLOW}--no-cache (полная пересборка)${NC}"
    fi
    echo ""

    # Проверка SSH ключа (всегда)
    check_ssh_key || exit 1

    # Pre-validation
    if [[ "$SKIP_CHECKS" == "false" ]]; then
        pre_validation || exit 1
    else
        warn "Pre-validation пропущена (--skip-checks)"
    fi

    DEPLOYMENT_STARTED=true

    # Создание бэкапа
    if [[ "$SKIP_BACKUP" == "false" ]]; then
        create_backup
    else
        warn "Создание бэкапа пропущено (--skip-backup)"
    fi

    # Бэкап SSL локально (пропускается в fast режиме)
    if [[ "$FAST_MODE" == "true" ]]; then
        warn "Бэкап SSL пропущен (--fast режим)"
    else
        backup_ssl_local
    fi

    # Копирование env файлов
    deploy_env || { ROLLBACK_NEEDED=true; rollback; exit 1; }

    # Синхронизация файлов
    sync_files || { ROLLBACK_NEEDED=true; rollback; exit 1; }

    # Остановка старых контейнеров
    stop_containers

    # Сборка образов
    build_images || { rollback; exit 1; }

    # Миграции
    run_migrations || { rollback; exit 1; }

    # Запуск сервисов
    start_services || { rollback; exit 1; }

    # Health checks
    health_check

    # Очистка
    cleanup

    # Результат
    show_result
}

# Запуск
main
