#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Счетчики
ERRORS=0
WARNINGS=0

echo "================================================"
echo "Проверка переменных окружения"
echo "================================================"

# Функция для проверки переменной
check_var() {
    local var_name=$1
    local env_file=$2
    local is_required=${3:-true}

    if grep -q "^${var_name}=" "$env_file" 2>/dev/null; then
        local value=$(grep "^${var_name}=" "$env_file" | cut -d'=' -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
        if [ -z "$value" ]; then
            if [ "$is_required" = true ]; then
                echo -e "${RED}✗${NC} ${var_name} определена, но пустая в ${env_file}"
                ((ERRORS++))
            else
                echo -e "${YELLOW}⚠${NC} ${var_name} определена, но пустая в ${env_file} (опционально)"
                ((WARNINGS++))
            fi
        else
            echo -e "${GREEN}✓${NC} ${var_name}"
        fi
    else
        if [ "$is_required" = true ]; then
            echo -e "${RED}✗${NC} ${var_name} отсутствует в ${env_file}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠${NC} ${var_name} отсутствует в ${env_file} (опционально)"
            ((WARNINGS++))
        fi
    fi
}

# Проверка наличия файлов .env
echo ""
echo "Проверка наличия файлов конфигурации..."
echo "----------------------------------------"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}✗${NC} Файл .env.production не найден!"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} .env.production найден"
fi

if [ ! -f ".env.production.example" ]; then
    echo -e "${YELLOW}⚠${NC} Файл .env.production.example не найден (рекомендуется)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} .env.production.example найден"
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}✗${NC} Файл docker-compose.prod.yml не найден!"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} docker-compose.prod.yml найден"
fi

# Если .env.production не существует, выходим
if [ ! -f ".env.production" ]; then
    echo ""
    echo -e "${RED}Критическая ошибка: .env.production не найден!${NC}"
    exit 1
fi

# Список обязательных переменных для production
echo ""
echo "Проверка переменных базы данных..."
echo "----------------------------------------"
check_var "DATABASE_URL" ".env.production" true
check_var "DIRECT_DATABASE_URL" ".env.production" true
check_var "DB_USER" ".env.production" true
check_var "DB_PASSWORD" ".env.production" true
check_var "DB_NAME" ".env.production" true
check_var "DB_HOST" ".env.production" true
check_var "DB_PORT" ".env.production" true

echo ""
echo "Проверка переменных JWT..."
echo "----------------------------------------"
check_var "JWT_SECRET" ".env.production" true
check_var "JWT_REFRESH_SECRET" ".env.production" true
check_var "JWT_EXPIRATION" ".env.production" true
check_var "JWT_REFRESH_EXPIRATION" ".env.production" true

echo ""
echo "Проверка переменных SMTP..."
echo "----------------------------------------"
check_var "SMTP_HOST" ".env.production" true
check_var "SMTP_PORT" ".env.production" true
check_var "SMTP_SECURE" ".env.production" true
check_var "SMTP_USER" ".env.production" true
check_var "SMTP_PASSWORD" ".env.production" true
check_var "EMAIL_FROM" ".env.production" true
check_var "FRONTEND_URL" ".env.production" true

echo ""
echo "Проверка переменных интеграций (опционально)..."
echo "----------------------------------------"
check_var "PYRUS_LOGIN" ".env.production" false
check_var "PYRUS_SECURITY_KEY" ".env.production" false
check_var "PYRUS_FORM_ID" ".env.production" false
check_var "YOOKASSA_SHOP_ID" ".env.production" false
check_var "YOOKASSA_SECRET_KEY" ".env.production" false

echo ""
echo "Проверка переменных фронтенда..."
echo "----------------------------------------"
check_var "NEXT_PUBLIC_API_URL" ".env.production" true

# Итоговый результат
echo ""
echo "================================================"
echo "Результаты проверки"
echo "================================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Все проверки пройдены успешно!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Найдено предупреждений: ${WARNINGS}${NC}"
    echo -e "${GREEN}✓ Критических ошибок не найдено${NC}"
    exit 0
else
    echo -e "${RED}✗ Найдено ошибок: ${ERRORS}${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Найдено предупреждений: ${WARNINGS}${NC}"
    fi
    echo ""
    echo "Пожалуйста, исправьте ошибки перед деплоем!"
    exit 1
fi
