# Тестирование

Запусти тесты и проверь работоспособность:

## Шаги:

1. **Backend тесты:**
   ```bash
   cd backend && npm test
   ```

2. **Frontend сборка:**
   ```bash
   cd frontend && npm run build
   ```

3. **TypeScript проверка:**
   ```bash
   npx tsc --noEmit
   ```

4. **Локальный запуск:**
   ```bash
   ./start-servers.sh
   ```

5. **Health check:**
   - Backend: http://localhost:3000/api/health
   - Frontend: http://localhost:3001

Укажи что конкретно нужно протестировать.
