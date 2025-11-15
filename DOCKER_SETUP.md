# Docker Setup

## Структура файлов Docker

```
project-root/
├── docker-compose.yml          # Для разработки
├── docker-compose.prod.yml     # Для продакшена
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ...
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ...
└── nginx/
    ├── nginx.conf              # Для продакшена
    └── Dockerfile
```

---

## Docker Compose для разработки

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: cultural_center_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cultural_center_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - cultural_center_network

  # Backend (NestJS)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: cultural_center_backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@db:5432/cultural_center_dev
      JWT_SECRET: your-secret-key-change-in-production
      JWT_EXPIRATION: 7d
      PORT: 3001
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - db
    networks:
      - cultural_center_network
    command: npm run start:dev

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: cultural_center_frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_API_URL: http://localhost:3001
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
    networks:
      - cultural_center_network
    command: npm run dev

  # pgAdmin (опционально, для управления БД)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: cultural_center_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - db
    networks:
      - cultural_center_network

volumes:
  postgres_data:

networks:
  cultural_center_network:
    driver: bridge
```

---

## Docker Compose для продакшена

**docker-compose.prod.yml:**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:15-alpine
    container_name: cultural_center_db_prod
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - cultural_center_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend (NestJS)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cultural_center_backend_prod
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION: ${JWT_EXPIRATION}
      PORT: 3001
      YUKASSA_SHOP_ID: ${YUKASSA_SHOP_ID}
      YUKASSA_SECRET_KEY: ${YUKASSA_SECRET_KEY}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - cultural_center_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cultural_center_frontend_prod
    restart: always
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    depends_on:
      - backend
    networks:
      - cultural_center_network

  # Nginx (Reverse Proxy)
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: cultural_center_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - frontend
      - backend
    networks:
      - cultural_center_network

  # Certbot для SSL сертификатов
  certbot:
    image: certbot/certbot
    container_name: cultural_center_certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  # Redis (опционально, для кэширования)
  redis:
    image: redis:7-alpine
    container_name: cultural_center_redis
    restart: always
    ports:
      - "6379:6379"
    networks:
      - cultural_center_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:

networks:
  cultural_center_network:
    driver: bridge
```

---

## Dockerfile для Backend (NestJS)

**backend/Dockerfile.dev:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "start:dev"]
```

**backend/Dockerfile (production):**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

**backend/.dockerignore:**

```
node_modules
dist
.env
.env.local
npm-debug.log
```

---

## Dockerfile для Frontend (Next.js)

**frontend/Dockerfile.dev:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

**frontend/Dockerfile (production):**

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

**frontend/.dockerignore:**

```
node_modules
.next
.env*.local
npm-debug.log
```

---

## Nginx конфигурация

**nginx/nginx.conf:**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers HIGH:!aNULL:!MD5;

        client_max_body_size 10M;

        # API requests
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

**nginx/Dockerfile:**

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

---

## .env файлы

**backend/.env.example:**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/cultural_center_dev

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=7d

# Server
PORT=3001
NODE_ENV=development

# ЮКасса (для продакшена)
YUKASSA_SHOP_ID=your_shop_id
YUKASSA_SECRET_KEY=your_secret_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@culturalcenter.ru
```

**frontend/.env.local.example:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

**Для продакшена создайте .env файл:**

```env
# Database
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=cultural_center_prod

# JWT
JWT_SECRET=your-very-secure-random-secret-key-here
JWT_EXPIRATION=7d

# ЮКасса
YUKASSA_SHOP_ID=your_shop_id
YUKASSA_SECRET_KEY=your_secret_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

## Команды для работы с Docker

### Разработка

```bash
# Запустить все сервисы
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановить сервисы
docker-compose down

# Пересобрать и запустить
docker-compose up -d --build

# Выполнить миграции БД
docker-compose exec backend npx prisma migrate dev

# Seed данных
docker-compose exec backend npx prisma db seed

# Доступ к БД через psql
docker-compose exec db psql -U postgres -d cultural_center_dev
```

### Продакшен

```bash
# Запустить продакшен
docker-compose -f docker-compose.prod.yml up -d

# Применить миграции
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Остановить
docker-compose -f docker-compose.prod.yml down

# Резервная копия БД
docker-compose -f docker-compose.prod.yml exec db pg_dump -U your_db_user cultural_center_prod > backup_$(date +%Y%m%d).sql

# Восстановление БД из бэкапа
docker-compose -f docker-compose.prod.yml exec -T db psql -U your_db_user cultural_center_prod < backup_20231215.sql
```

### SSL сертификат (Let's Encrypt)

```bash
# Первоначальная настройка SSL
docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d your-domain.com -d www.your-domain.com

# Проверка автоматического обновления
docker-compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

---

## Мониторинг и логирование

### Логирование в файл

Добавьте в `docker-compose.prod.yml`:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Healthcheck endpoints

В NestJS создайте health controller:

```typescript
// backend/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
```

---

## Автоматический бэкап БД

Создайте скрипт `backup.sh`:

```bash
#!/bin/bash

# Настройки
BACKUP_DIR="/path/to/backups"
DB_CONTAINER="cultural_center_db_prod"
DB_USER="your_db_user"
DB_NAME="cultural_center_prod"
DATE=$(date +%Y%m%d_%H%M%S)

# Создать бэкап
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Удалить старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "backup_*.sql.gz" -type f -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

Добавьте в crontab:

```bash
# Ежедневный бэкап в 2 ночи
0 2 * * * /path/to/backup.sh >> /var/log/db_backup.log 2>&1
```

---

## Troubleshooting

### Проблема: Frontend не может подключиться к Backend

**Решение:** Проверьте `NEXT_PUBLIC_API_URL` в `.env.local`

### Проблема: Ошибка подключения к БД

**Решение:**
```bash
docker-compose logs db
docker-compose restart db
```

### Проблема: Порт уже занят

**Решение:** Измените порты в `docker-compose.yml` или остановите конфликтующий процесс:
```bash
lsof -i :3000
kill -9 <PID>
```

### Очистка Docker

```bash
# Удалить все неиспользуемые контейнеры, сети, образы
docker system prune -a

# Удалить volumes (ОСТОРОЖНО: удалит все данные)
docker volume prune
```
