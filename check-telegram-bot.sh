#!/bin/bash

# Скрипт быстрой проверки Telegram бота после деплоя
# Использование: ./check-telegram-bot.sh

BOT_TOKEN="5193485073:AAHnsd-6Bc1FHYsw80QErZFcKYtE9_3RbO8"
API_URL="https://crm.artsvao.ru"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Проверка Telegram бота после деплоя              ║"
echo "╚═══════════════════════════════════════════════════════╝"

# Цветовые коды
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки
check_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"

    echo -e "\n${YELLOW}Проверка: $name${NC}"
    echo "URL: $url"

    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ OK (HTTP $http_code)${NC}"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}✗ ОШИБКА (HTTP $http_code)${NC}"
        echo "$body"
        return 1
    fi
}

# Счётчик успешных/неуспешных проверок
success=0
failed=0

# 1. Health check
if check_endpoint "Backend Health" "$API_URL/api/health"; then
    ((success++))
else
    ((failed++))
fi

# 2. Telegram webhook-info endpoint
if check_endpoint "Telegram Webhook Info Endpoint" "$API_URL/api/telegram/webhook-info"; then
    ((success++))
else
    ((failed++))
fi

# 3. Telegram API webhook status
echo -e "\n${YELLOW}Проверка: Telegram API - статус вебхука${NC}"
webhook_info=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
echo "$webhook_info" | python3 -m json.tool

# Проверяем наличие ошибок в вебхуке
if echo "$webhook_info" | grep -q "last_error_message"; then
    echo -e "${RED}✗ ВНИМАНИЕ: Есть ошибки в вебхуке!${NC}"
    ((failed++))
else
    # Проверяем правильный URL
    if echo "$webhook_info" | grep -q "https://crm.artsvao.ru/api/telegram/webhook"; then
        echo -e "${GREEN}✓ Вебхук настроен правильно${NC}"
        ((success++))
    else
        echo -e "${RED}✗ Вебхук настроен на неправильный URL${NC}"
        ((failed++))
    fi
fi

# 4. Проверка bot info
echo -e "\n${YELLOW}Проверка: Информация о боте${NC}"
bot_info=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
if echo "$bot_info" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓ Бот доступен${NC}"
    echo "$bot_info" | python3 -m json.tool
    ((success++))
else
    echo -e "${RED}✗ Ошибка доступа к боту${NC}"
    echo "$bot_info"
    ((failed++))
fi

# Итоги
echo -e "\n╔═══════════════════════════════════════════════════════╗"
echo -e "║                    РЕЗУЛЬТАТЫ                         ║"
echo -e "╚═══════════════════════════════════════════════════════╝"
echo -e "Успешно: ${GREEN}$success${NC}"
echo -e "Ошибок:  ${RED}$failed${NC}"

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}✓ Все проверки пройдены! Telegram бот готов к работе.${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Обнаружены проблемы. Проверьте детали выше.${NC}"
    echo -e "\nДля решения проблем смотрите: TELEGRAM_DEPLOY_CHECKLIST.md"
    exit 1
fi
