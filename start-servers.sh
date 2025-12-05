#!/bin/bash

# Скрипт для запуска Backend и Frontend серверов на фиксированных портах
# Backend: порт 3000
# Frontend: порт 3001

PROJECT_DIR="$HOME/artsvao"
LOGS_DIR="$PROJECT_DIR/logs"
BACKEND_PORT=3000
FRONTEND_PORT=3001
BACKEND_TIMEOUT=60
FRONTEND_TIMEOUT=30

# Создаем директорию для логов если не существует
mkdir -p "$LOGS_DIR"

# Функция для освобождения порта (единственный способ остановки)
free_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "  Порт $port занят (PID: $pids). Освобождаю..."
        echo "$pids" | xargs kill -TERM 2>/dev/null
        sleep 3
        # Проверяем, остались ли процессы
        pids=$(lsof -ti :$port 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "  Принудительное завершение..."
            echo "$pids" | xargs kill -9 2>/dev/null
            sleep 1
        fi
    fi
}

# Функция проверки порта (ss надёжнее lsof для дочерних процессов)
is_port_listening() {
    local port=$1
    ss -tlnH "sport = :$port" 2>/dev/null | grep -q "LISTEN"
}

# Функция ожидания порта с таймаутом
wait_for_port() {
    local port=$1
    local timeout=$2
    local start_time=$(date +%s)

    echo "  Ожидание порта $port (таймаут: ${timeout}с)..."

    while true; do
        if is_port_listening $port; then
            return 0
        fi

        local elapsed=$(($(date +%s) - start_time))
        if [ $elapsed -ge $timeout ]; then
            return 1
        fi

        sleep 1
    done
}

# Функция проверки HTTP health (опционально)
check_http_health() {
    local url=$1
    local timeout=5

    if command -v curl &> /dev/null; then
        curl -sf --max-time $timeout "$url" > /dev/null 2>&1
        return $?
    fi
    return 0  # Если curl недоступен, пропускаем проверку
}

echo "Остановка серверов..."

# Упрощённая остановка - только через освобождение портов
free_port $BACKEND_PORT
free_port $FRONTEND_PORT

echo "  Порты освобождены"

echo ""
echo "Запуск Backend на порту $BACKEND_PORT..."
cd "$PROJECT_DIR/backend" && PORT=$BACKEND_PORT npm run start:dev > "$LOGS_DIR/backend.log" 2>&1 &
echo "   Backend запущен в фоне"

# Ожидание порта с таймаутом вместо фиксированного sleep
if ! wait_for_port $BACKEND_PORT $BACKEND_TIMEOUT; then
    echo "ОШИБКА: Backend не запустился за ${BACKEND_TIMEOUT}с!"
    echo "Последние строки лога:"
    tail -30 "$LOGS_DIR/backend.log"
    exit 1
fi

# HTTP health check для backend
if check_http_health "http://localhost:$BACKEND_PORT/api"; then
    echo "   Backend готов (health check OK)"
else
    echo "   Backend слушает порт (health check пропущен)"
fi

echo ""
echo "Запуск Frontend на порту $FRONTEND_PORT..."
cd "$PROJECT_DIR/frontend" && PORT=$FRONTEND_PORT pnpm dev > "$LOGS_DIR/frontend.log" 2>&1 &
echo "   Frontend запущен в фоне"

# Ожидание порта с таймаутом
if ! wait_for_port $FRONTEND_PORT $FRONTEND_TIMEOUT; then
    echo "ОШИБКА: Frontend не запустился за ${FRONTEND_TIMEOUT}с!"
    echo "Последние строки лога:"
    tail -30 "$LOGS_DIR/frontend.log"
    exit 1
fi

echo "   Frontend готов"

echo ""
echo "Серверы успешно запущены!"
echo "   Backend:  http://localhost:$BACKEND_PORT/api"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "Логи:"
echo "   Backend:  $LOGS_DIR/backend.log"
echo "   Frontend: $LOGS_DIR/frontend.log"
echo ""
echo "Для остановки: $0 (перезапуск автоматически остановит)"
