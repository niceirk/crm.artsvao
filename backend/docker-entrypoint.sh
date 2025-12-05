#!/bin/sh
set -e

echo "=================================="
echo "Starting ARTSVAO Backend"
echo "=================================="

# ВАЖНО: Миграции выполняются в deploy скрипте, НЕ здесь!
# Это предотвращает двойное выполнение миграций и race conditions.
# См. deploy-unified.sh -> run_migrations()

echo ""
echo "Starting application with PM2 cluster mode..."

# PM2_CLUSTER_MODE - включить/выключить cluster mode (default: true)
if [ "${PM2_CLUSTER_MODE:-true}" = "true" ]; then
  echo "PM2 cluster mode: ENABLED (2 instances)"
  exec pm2-runtime ecosystem.config.js --env production
else
  echo "PM2 cluster mode: DISABLED (single instance)"
  exec node dist/src/main
fi
