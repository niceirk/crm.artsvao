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
echo "Проверка зависимостей проекта"
echo "================================================"

# Проверка наличия необходимых инструментов
echo ""
echo "Проверка системных инструментов..."
echo "----------------------------------------"

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    echo -e "${GREEN}✓${NC} Docker установлен (версия: $DOCKER_VERSION)"
else
    echo -e "${RED}✗${NC} Docker не установлен!"
    ((ERRORS++))
fi

# Docker Compose
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version | grep -oP '\d+\.\d+\.\d+' | head -1)
    echo -e "${GREEN}✓${NC} Docker Compose установлен (версия: $COMPOSE_VERSION)"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    echo -e "${GREEN}✓${NC} Docker Compose установлен (версия: $COMPOSE_VERSION)"
else
    echo -e "${RED}✗${NC} Docker Compose не установлен!"
    ((ERRORS++))
fi

# Git (опционально)
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    echo -e "${GREEN}✓${NC} Git установлен (версия: $GIT_VERSION)"
else
    echo -e "${YELLOW}⚠${NC} Git не установлен (опционально)"
    ((WARNINGS++))
fi

# Проверка файлов package.json
echo ""
echo "Проверка файлов package.json..."
echo "----------------------------------------"

if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}✓${NC} backend/package.json найден"

    # Проверка наличия package-lock.json
    if [ -f "backend/package-lock.json" ]; then
        echo -e "${GREEN}✓${NC} backend/package-lock.json найден"
    else
        echo -e "${YELLOW}⚠${NC} backend/package-lock.json отсутствует"
        ((WARNINGS++))
    fi

    # Проверка основных зависимостей backend
    BACKEND_DEPS=("@nestjs/core" "@nestjs/common" "prisma" "@nestjs-modules/mailer")
    for dep in "${BACKEND_DEPS[@]}"; do
        if grep -q "\"$dep\"" backend/package.json; then
            echo -e "${GREEN}✓${NC} Зависимость $dep найдена"
        else
            echo -e "${YELLOW}⚠${NC} Зависимость $dep не найдена в package.json"
            ((WARNINGS++))
        fi
    done
else
    echo -e "${RED}✗${NC} backend/package.json не найден!"
    ((ERRORS++))
fi

if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✓${NC} frontend/package.json найден"

    # Проверка наличия package-lock или pnpm-lock
    if [ -f "frontend/package-lock.json" ] || [ -f "frontend/pnpm-lock.yaml" ]; then
        echo -e "${GREEN}✓${NC} frontend lock файл найден"
    else
        echo -e "${YELLOW}⚠${NC} frontend lock файл отсутствует"
        ((WARNINGS++))
    fi

    # Проверка основных зависимостей frontend
    FRONTEND_DEPS=("next" "react" "react-dom")
    for dep in "${FRONTEND_DEPS[@]}"; do
        if grep -q "\"$dep\"" frontend/package.json; then
            echo -e "${GREEN}✓${NC} Зависимость $dep найдена"
        else
            echo -e "${YELLOW}⚠${NC} Зависимость $dep не найдена в package.json"
            ((WARNINGS++))
        fi
    done
else
    echo -e "${RED}✗${NC} frontend/package.json не найден!"
    ((ERRORS++))
fi

# Проверка Prisma схемы
echo ""
echo "Проверка Prisma конфигурации..."
echo "----------------------------------------"

if [ -f "backend/prisma/schema.prisma" ]; then
    echo -e "${GREEN}✓${NC} backend/prisma/schema.prisma найден"

    # Проверка наличия generator client
    if grep -q "generator client" backend/prisma/schema.prisma; then
        echo -e "${GREEN}✓${NC} Prisma generator client определен"
    else
        echo -e "${RED}✗${NC} Prisma generator client не найден!"
        ((ERRORS++))
    fi

    # Проверка наличия datasource
    if grep -q "datasource db" backend/prisma/schema.prisma; then
        echo -e "${GREEN}✓${NC} Prisma datasource определен"
    else
        echo -e "${RED}✗${NC} Prisma datasource не найден!"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} backend/prisma/schema.prisma не найден!"
    ((ERRORS++))
fi

# Проверка миграций
if [ -d "backend/prisma/migrations" ]; then
    MIGRATION_COUNT=$(find backend/prisma/migrations -maxdepth 1 -type d ! -name migrations | wc -l)
    if [ $MIGRATION_COUNT -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Найдено миграций: $MIGRATION_COUNT"
    else
        echo -e "${YELLOW}⚠${NC} Директория migrations пуста"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Директория migrations не найдена"
    ((WARNINGS++))
fi

# Проверка Dockerfile
echo ""
echo "Проверка Dockerfile..."
echo "----------------------------------------"

if [ -f "backend/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} backend/Dockerfile найден"

    # Проверка ключевых инструкций
    if grep -q "FROM node" backend/Dockerfile; then
        echo -e "${GREEN}✓${NC} Используется Node.js образ"
    else
        echo -e "${YELLOW}⚠${NC} Не найдена инструкция FROM node"
        ((WARNINGS++))
    fi

    if grep -q "COPY package" backend/Dockerfile; then
        echo -e "${GREEN}✓${NC} Копирование package файлов"
    else
        echo -e "${YELLOW}⚠${NC} Не найдено копирование package файлов"
        ((WARNINGS++))
    fi

    if grep -q "npm install\|npm ci\|yarn install\|pnpm install" backend/Dockerfile; then
        echo -e "${GREEN}✓${NC} Установка зависимостей"
    else
        echo -e "${RED}✗${NC} Не найдена установка зависимостей!"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} backend/Dockerfile не найден!"
    ((ERRORS++))
fi

if [ -f "frontend/Dockerfile" ]; then
    echo -e "${GREEN}✓${NC} frontend/Dockerfile найден"

    # Проверка ключевых инструкций
    if grep -q "FROM node" frontend/Dockerfile; then
        echo -e "${GREEN}✓${NC} Используется Node.js образ"
    else
        echo -e "${YELLOW}⚠${NC} Не найдена инструкция FROM node"
        ((WARNINGS++))
    fi

    if grep -q "npm install\|npm ci\|yarn install\|pnpm install" frontend/Dockerfile; then
        echo -e "${GREEN}✓${NC} Установка зависимостей"
    else
        echo -e "${RED}✗${NC} Не найдена установка зависимостей!"
        ((ERRORS++))
    fi

    if grep -q "npm run build\|yarn build\|pnpm build" frontend/Dockerfile; then
        echo -e "${GREEN}✓${NC} Команда сборки найдена"
    else
        echo -e "${RED}✗${NC} Не найдена команда сборки!"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} frontend/Dockerfile не найден!"
    ((ERRORS++))
fi

# Проверка .dockerignore
echo ""
echo "Проверка .dockerignore..."
echo "----------------------------------------"

if [ -f "backend/.dockerignore" ]; then
    echo -e "${GREEN}✓${NC} backend/.dockerignore найден"
else
    echo -e "${YELLOW}⚠${NC} backend/.dockerignore отсутствует (рекомендуется)"
    ((WARNINGS++))
fi

if [ -f "frontend/.dockerignore" ]; then
    echo -e "${GREEN}✓${NC} frontend/.dockerignore найден"
else
    echo -e "${YELLOW}⚠${NC} frontend/.dockerignore отсутствует (рекомендуется)"
    ((WARNINGS++))
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
