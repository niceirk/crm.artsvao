# 🚀 Быстрый старт: Оптимизированный деплой

## ⚡ Основные команды (копируй и используй)

### 1️⃣ Обычный деплой (изменения в коде)
```bash
# Если менялся только backend
bash deploy-optimized.sh --service backend

# Если менялся только frontend
bash deploy-optimized.sh --service frontend

# Если менялись оба
bash deploy-optimized.sh
```
⏱️ **Время: 1-3 минуты**

### 2️⃣ Обновили зависимости (npm install)
```bash
# Обновили пакеты в backend
bash deploy-optimized.sh --service backend

# Обновили пакеты в frontend
bash deploy-optimized.sh --service frontend
```
⏱️ **Время: 3-5 минут**

### 3️⃣ Если что-то сломалось
```bash
# Полная пересборка без кэша
bash deploy-optimized.sh --force-rebuild
```
⏱️ **Время: 10-15 минут**

## 📋 Чек-лист перед деплоем

- [ ] Закоммитил изменения в git
- [ ] Проверил, какой сервис изменился (backend/frontend/оба)
- [ ] Обновил `.env.production` если добавлял переменные
- [ ] Готов к деплою!

## 🎯 Примеры для типичных ситуаций

### Ситуация 1: Исправил баг в backend
```bash
# 1. Закоммитил изменения
git add backend/src
git commit -m "fix: исправлен баг с сообщениями"

# 2. Быстрый деплой
bash deploy-optimized.sh --service backend
```

### Ситуация 2: Обновил дизайн на фронте
```bash
# 1. Закоммитил изменения
git add frontend/src
git commit -m "feat: новый дизайн главной страницы"

# 2. Быстрый деплой
bash deploy-optimized.sh --service frontend
```

### Ситуация 3: Добавил новую фичу (backend + frontend)
```bash
# 1. Закоммитил изменения
git add .
git commit -m "feat: добавлен чат с клиентами"

# 2. Полный деплой
bash deploy-optimized.sh
```

### Ситуация 4: Добавил новую библиотеку
```bash
# 1. Установил библиотеку локально
cd backend
npm install новая-библиотека

# 2. Закоммитил изменения
git add package.json package-lock.json
git commit -m "chore: добавлена библиотека X"

# 3. Деплой (Docker пересоберет слой с npm ci)
bash deploy-optimized.sh --service backend
```

## 🆘 Что делать если...

### ❓ Деплой прошел, но изменения не видны
```bash
# 1. Проверь логи
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml logs -f backend'

# 2. Проверь, что контейнер перезапустился
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml ps'

# 3. Принудительная пересборка
bash deploy-optimized.sh --force-rebuild --service backend
```

### ❓ Ошибка при миграциях БД
```bash
# 1. Проверь статус миграций на сервере
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status'

# 2. Примени миграции вручную
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy'
```

### ❓ Контейнер не запускается
```bash
# 1. Полные логи
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml logs backend'

# 2. Проверь .env.production
ssh root@109.196.102.90 'cat /opt/artsvao/.env.production | head -20'

# 3. Перезапусти вручную
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml restart backend'
```

## 🔍 Проверка после деплоя

```bash
# 1. Статус контейнеров
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml ps'

# 2. Последние логи backend
ssh root@109.196.102.90 'cd /opt/artsvao && docker compose -f docker-compose.prod.yml logs --tail=50 backend'

# 3. Проверка через браузер
# Открой: https://crm.artsvao.ru
```

## 💡 Полезные алиасы (добавь в ~/.bashrc)

```bash
# Быстрый деплой backend
alias deploy-backend='bash ~/artsvao/deploy-optimized.sh --service backend'

# Быстрый деплой frontend
alias deploy-frontend='bash ~/artsvao/deploy-optimized.sh --service frontend'

# Полный деплой
alias deploy-all='bash ~/artsvao/deploy-optimized.sh'

# Логи на сервере
alias logs-backend='ssh root@109.196.102.90 "cd /opt/artsvao && docker compose -f docker-compose.prod.yml logs -f backend"'

# Статус на сервере
alias status-server='ssh root@109.196.102.90 "cd /opt/artsvao && docker compose -f docker-compose.prod.yml ps"'
```

После добавления:
```bash
source ~/.bashrc

# Теперь можно использовать:
deploy-backend
logs-backend
```

## 📊 Время деплоя - ожидания vs реальность

| Что делаешь | Ожидаемое время | Если дольше |
|-------------|-----------------|-------------|
| Меняешь код | 1-3 мин | Проверь интернет |
| Добавляешь пакет | 3-5 мин | Нормально |
| --force-rebuild | 10-15 мин | Нормально |
| Первый деплой | 8-10 мин | Нормально |

## 🎓 Дополнительная документация

- **Подробно про оптимизацию:** `DEPLOY_OPTIMIZATION.md`
- **Troubleshooting:** `DEPLOYMENT_CHECKS.md`
- **История улучшений:** `DEPLOY_IMPROVEMENTS.md`

---

**Совет:** Сохрани эту страницу в закладки браузера! 🔖
