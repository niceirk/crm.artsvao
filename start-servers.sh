#!/bin/bash

# Скрипт для запуска Backend и Frontend серверов на фиксированных портах
# Backend: порт 3000
# Frontend: порт 3001

echo "🔄 Остановка всех запущенных серверов..."
pkill -f "node.*backend" 2>/dev/null
pkill -f "node.*frontend" 2>/dev/null
pkill -f "next" 2>/dev/null
sleep 2

echo "🚀 Запуск Backend на порту 3000..."
cd ~/artsvao/backend && PORT=3000 npm run start:dev > ~/artsvao/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

echo "⏳ Ожидание запуска Backend (10 секунд)..."
sleep 10

echo "🚀 Запуск Frontend на порту 3001..."
cd ~/artsvao/frontend && PORT=3001 pnpm dev > ~/artsvao/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ Серверы запущены!"
echo "   📡 Backend:  http://localhost:3000/api"
echo "   🌐 Frontend: http://localhost:3001"
echo ""
echo "📝 Логи:"
echo "   Backend:  ~/artsvao/logs/backend.log"
echo "   Frontend: ~/artsvao/logs/frontend.log"
echo ""
echo "🛑 Для остановки используйте:"
echo "   pkill -f 'node.*backend'"
echo "   pkill -f 'node.*frontend'"
