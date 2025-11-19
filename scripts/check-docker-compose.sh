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
echo "Проверка согласованности docker-compose"
echo "================================================"

# Проверка наличия файлов
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}✗${NC} docker-compose.prod.yml не найден!"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo -e "${RED}✗${NC} .env.production не найден!"
    exit 1
fi

# Проверка наличия env_file директивы
echo ""
echo "Проверка директивы env_file..."
echo "----------------------------------------"

if grep -q "env_file:" docker-compose.prod.yml; then
    echo -e "${GREEN}✓${NC} Директива env_file найдена"

    # Извлекаем файлы из env_file
    ENV_FILES=$(grep -A 5 "env_file:" docker-compose.prod.yml | grep -E '^\s+-\s+' | sed 's/^\s*-\s*//' | tr -d '"')

    while IFS= read -r env_file; do
        if [ -f "$env_file" ]; then
            echo -e "${GREEN}✓${NC} Файл $env_file существует"
        else
            echo -e "${RED}✗${NC} Файл $env_file не найден!"
            ((ERRORS++))
        fi
    done <<< "$ENV_FILES"
else
    echo -e "${YELLOW}⚠${NC} Директива env_file не найдена в docker-compose.prod.yml"
    echo -e "${YELLOW}  Переменные окружения должны быть установлены в окружении хост-системы${NC}"
    ((WARNINGS++))
fi

# Извлечение переменных из docker-compose.prod.yml
echo ""
echo "Извлечение переменных из docker-compose.prod.yml..."
echo "----------------------------------------"

# Функция для извлечения переменных из секции environment
extract_env_vars() {
    local service=$1
    # Ищем секцию environment для указанного сервиса и извлекаем переменные вида ${VAR_NAME}
    sed -n "/^  ${service}:/,/^  [a-z]/p" docker-compose.prod.yml | \
    grep -E '^\s+[A-Z_]+:\s+\$\{[A-Z_]+\}' | \
    grep -oP '\$\{\K[^}]+' | sort -u
}

echo ""
echo "Проверка переменных для сервиса backend..."
echo "----------------------------------------"
BACKEND_VARS=$(extract_env_vars "backend")

if [ -z "$BACKEND_VARS" ]; then
    echo -e "${YELLOW}⚠${NC} Не найдено переменных окружения для backend"
    ((WARNINGS++))
else
    MISSING_VARS=0
    while IFS= read -r var; do
        if grep -q "^${var}=" ".env.production" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} ${var} присутствует в .env.production"
        else
            echo -e "${RED}✗${NC} ${var} отсутствует в .env.production"
            ((ERRORS++))
            ((MISSING_VARS++))
        fi
    done <<< "$BACKEND_VARS"

    if [ $MISSING_VARS -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Все переменные backend найдены в .env.production"
    fi
fi

echo ""
echo "Проверка переменных для сервиса frontend..."
echo "----------------------------------------"
FRONTEND_VARS=$(extract_env_vars "frontend")

if [ -z "$FRONTEND_VARS" ]; then
    echo -e "${YELLOW}⚠${NC} Не найдено переменных окружения для frontend"
    ((WARNINGS++))
else
    MISSING_VARS=0
    while IFS= read -r var; do
        if grep -q "^${var}=" ".env.production" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} ${var} присутствует в .env.production"
        else
            echo -e "${RED}✗${NC} ${var} отсутствует в .env.production"
            ((ERRORS++))
            ((MISSING_VARS++))
        fi
    done <<< "$FRONTEND_VARS"

    if [ $MISSING_VARS -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Все переменные frontend найдены в .env.production"
    fi
fi

echo ""
echo "Проверка переменных для сервиса postgres..."
echo "----------------------------------------"
POSTGRES_VARS=$(extract_env_vars "postgres")

if [ -z "$POSTGRES_VARS" ]; then
    echo -e "${YELLOW}⚠${NC} Не найдено переменных окружения для postgres"
    ((WARNINGS++))
else
    MISSING_VARS=0
    while IFS= read -r var; do
        if grep -q "^${var}=" ".env.production" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} ${var} присутствует в .env.production"
        else
            echo -e "${RED}✗${NC} ${var} отсутствует в .env.production"
            ((ERRORS++))
            ((MISSING_VARS++))
        fi
    done <<< "$POSTGRES_VARS"

    if [ $MISSING_VARS -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Все переменные postgres найдены в .env.production"
    fi
fi

# Проверка наличия Dockerfile для каждого сервиса
echo ""
echo "Проверка наличия Dockerfile..."
echo "----------------------------------------"

if grep -q "build:" docker-compose.prod.yml; then
    if grep -q "context: ./backend" docker-compose.prod.yml; then
        if [ -f "backend/Dockerfile" ]; then
            echo -e "${GREEN}✓${NC} backend/Dockerfile найден"
        else
            echo -e "${RED}✗${NC} backend/Dockerfile не найден!"
            ((ERRORS++))
        fi
    fi

    if grep -q "context: ./frontend" docker-compose.prod.yml; then
        if [ -f "frontend/Dockerfile" ]; then
            echo -e "${GREEN}✓${NC} frontend/Dockerfile найден"
        else
            echo -e "${RED}✗${NC} frontend/Dockerfile не найден!"
            ((ERRORS++))
        fi
    fi
fi

# Проверка наличия volumes и networks
echo ""
echo "Проверка конфигурации volumes и networks..."
echo "----------------------------------------"

if grep -q "^volumes:" docker-compose.prod.yml; then
    echo -e "${GREEN}✓${NC} Секция volumes определена"
else
    echo -e "${YELLOW}⚠${NC} Секция volumes не определена"
    ((WARNINGS++))
fi

if grep -q "^networks:" docker-compose.prod.yml; then
    echo -e "${GREEN}✓${NC} Секция networks определена"
else
    echo -e "${YELLOW}⚠${NC} Секция networks не определена"
    ((WARNINGS++))
fi

# Проверка портов
echo ""
echo "Проверка портов..."
echo "----------------------------------------"

if grep -q "ports:" docker-compose.prod.yml; then
    PORTS=$(grep -A 2 "ports:" docker-compose.prod.yml | grep -E '^\s+-\s+"[0-9]+:[0-9]+"' | grep -oP '"\K[0-9]+(?=:)')
    if [ -n "$PORTS" ]; then
        echo -e "${GREEN}✓${NC} Определены порты: $(echo $PORTS | tr '\n' ', ' | sed 's/, $//')"
    fi
fi

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
