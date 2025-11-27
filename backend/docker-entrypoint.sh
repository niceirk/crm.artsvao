#!/bin/sh
set -e

echo "=================================="
echo "Starting ARTSVAO Backend"
echo "=================================="

# ВАЖНО: Миграции выполняются в deploy скрипте, НЕ здесь!
# Это предотвращает двойное выполнение миграций и race conditions.
# См. deploy-unified.sh -> run_migrations()

echo ""
echo "Starting application..."
exec node dist/src/main
