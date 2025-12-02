#!/bin/bash

# Скрипт для запуска Backend и Frontend серверов на фиксированных портах
# Backend: порт 3000
# Frontend: порт 3001

# Создаем директорию для логов если не существует
mkdir -p ~/artsvao/logs

# Функция для освобождения порта
free_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "  Порт $port занят (PID: $pids). Освобождаю..."
        echo "$pids" | xargs kill -TERM 2>/dev/null
        sleep 2
        # Проверяем, остались ли процессы
        pids=$(lsof -ti :$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null
            sleep 1
        fi
    fi
}

echo "Остановка всех запущенных серверов..."

# Graceful shutdown для backend (SIGTERM)
echo "  Отправка SIGTERM backend процессам..."
pkill -TERM -f "nest start" 2>/dev/null
pkill -TERM -f "node.*backend.*dist/src/main" 2>/dev/null
pkill -TERM -f "node.*dist/src/main" 2>/dev/null

# Graceful shutdown для frontend
pkill -TERM -f "next dev" 2>/dev/null
pkill -TERM -f "pnpm dev" 2>/dev/null
pkill -TERM -f "node.*frontend" 2>/dev/null

# Ждем graceful shutdown (10 секунд для корректного закрытия соединений БД)
echo "  Ожидание graceful shutdown (10 сек)..."
sleep 10

# Принудительное завершение оставшихся процессов
if pgrep -f "nest start|node.*backend.*dist/src/main|next dev|pnpm dev" > /dev/null; then
    echo "  Принудительное завершение оставшихся процессов..."
    pkill -9 -f "nest start" 2>/dev/null
    pkill -9 -f "node.*backend.*dist/src/main" 2>/dev/null
    pkill -9 -f "node.*dist/src/main" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    pkill -9 -f "pnpm dev" 2>/dev/null
    pkill -9 -f "node.*frontend" 2>/dev/null
    sleep 2
fi

# Гарантированное освобождение портов
echo "  Проверка и освобождение портов..."
free_port 3000
free_port 3001

echo "  Все процессы остановлены"

echo "Запуск Backend на порту 3000..."
cd ~/artsvao/backend && PORT=3000 npm run start:dev > ~/artsvao/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

echo "Ожидание запуска Backend (15 секунд)..."
sleep 15

# Проверка запуска Backend
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "ОШИБКА: Backend не запустился!"
    echo "Последние строки лога:"
    tail -20 ~/artsvao/logs/backend.log
    exit 1
fi

# Проверка что порт 3000 занят
if ! lsof -i :3000 > /dev/null 2>&1; then
    echo "ОШИБКА: Backend запущен, но порт 3000 не слушает!"
    echo "Последние строки лога:"
    tail -20 ~/artsvao/logs/backend.log
    exit 1
fi

echo "   Backend успешно запущен"

echo "Запуск Frontend на порту 3001..."
cd ~/artsvao/frontend && PORT=3001 pnpm dev > ~/artsvao/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo "Ожидание запуска Frontend (10 секунд)..."
sleep 10

# Проверка запуска Frontend
if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "ОШИБКА: Frontend не запустился!"
    echo "Последние строки лога:"
    tail -20 ~/artsvao/logs/frontend.log
    exit 1
fi

# Проверка что порт 3001 занят
if ! lsof -i :3001 > /dev/null 2>&1; then
    echo "ОШИБКА: Frontend запущен, но порт 3001 не слушает!"
    echo "Последние строки лога:"
    tail -20 ~/artsvao/logs/frontend.log
    exit 1
fi

echo ""
echo "Серверы успешно запущены!"
echo "   Backend:  http://localhost:3000/api"
echo "   Frontend: http://localhost:3001"
echo ""
echo "Логи:"
echo "   Backend:  ~/artsvao/logs/backend.log"
echo "   Frontend: ~/artsvao/logs/frontend.log"
echo ""
echo "Для остановки используйте:"
echo "   pkill -f 'node.*backend'"
echo "   pkill -f 'node.*frontend'"
