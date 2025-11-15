# Структура проекта

## Общая структура монорепозитория

```
cultural-center-management/
├── README.md
├── PROJECT_SPECIFICATION.md
├── DATABASE_SCHEMA.md
├── DOCKER_SETUP.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .gitignore
├── .env.example
│
├── frontend/                    # Next.js приложение
│   ├── src/
│   │   ├── app/                # App Router (Next.js 14)
│   │   │   ├── (auth)/         # Группа маршрутов для аутентификации
│   │   │   │   ├── login/
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/    # Защищенные маршруты
│   │   │   │   ├── clients/    # CRM
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── new/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── schedule/   # Расписание
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── rentals/    # Аренда
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── studios/    # Студии
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── subscriptions/ # Абонементы
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reports/    # Отчеты
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── salary/     # Зарплаты
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── settings/   # Справочники
│   │   │   │   │   ├── rooms/
│   │   │   │   │   ├── teachers/
│   │   │   │   │   └── users/
│   │   │   │   └── layout.tsx  # Layout с навигацией
│   │   │   ├── api/            # API routes (если нужны)
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Home page (redirect)
│   │   │
│   │   ├── components/         # React компоненты
│   │   │   ├── ui/             # shadcn/ui компоненты
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── calendar.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/         # Layout компоненты
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Breadcrumbs.tsx
│   │   │   ├── clients/        # Компоненты для CRM
│   │   │   │   ├── ClientCard.tsx
│   │   │   │   ├── ClientList.tsx
│   │   │   │   ├── ClientForm.tsx
│   │   │   │   ├── ClientHistory.tsx
│   │   │   │   └── ClientRelations.tsx
│   │   │   ├── schedule/       # Компоненты расписания
│   │   │   │   ├── ScheduleCalendar.tsx
│   │   │   │   ├── EventModal.tsx
│   │   │   │   └── ConflictChecker.tsx
│   │   │   ├── rentals/
│   │   │   │   ├── RentalForm.tsx
│   │   │   │   └── RentalList.tsx
│   │   │   ├── subscriptions/
│   │   │   │   ├── SubscriptionCard.tsx
│   │   │   │   └── PurchaseModal.tsx
│   │   │   └── reports/
│   │   │       ├── FinancialChart.tsx
│   │   │       └── AttendanceChart.tsx
│   │   │
│   │   ├── lib/                # Утилиты и конфигурация
│   │   │   ├── api.ts          # API client
│   │   │   ├── auth.ts         # Аутентификация
│   │   │   ├── utils.ts        # Общие утилиты
│   │   │   └── validators.ts   # Zod схемы валидации
│   │   │
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useClients.ts
│   │   │   ├── useSchedule.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── store/              # Zustand store
│   │   │   ├── authStore.ts
│   │   │   ├── clientStore.ts
│   │   │   └── scheduleStore.ts
│   │   │
│   │   └── types/              # TypeScript типы
│   │       ├── client.ts
│   │       ├── schedule.ts
│   │       ├── subscription.ts
│   │       └── api.ts
│   │
│   ├── public/                 # Статические файлы
│   │   ├── images/
│   │   └── fonts/
│   │
│   ├── .env.local
│   ├── .env.example
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── .dockerignore
│
├── backend/                    # NestJS приложение
│   ├── src/
│   │   ├── main.ts            # Entry point
│   │   ├── app.module.ts      # Root module
│   │   │
│   │   ├── auth/              # Auth модуль
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── users/             # Users модуль
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── clients/           # CRM модуль
│   │   │   ├── clients.module.ts
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── client-relations.service.ts
│   │   │   ├── client-import.service.ts
│   │   │   └── dto/
│   │   │       ├── create-client.dto.ts
│   │   │       ├── update-client.dto.ts
│   │   │       ├── create-relation.dto.ts
│   │   │       └── import-clients.dto.ts
│   │   │
│   │   ├── rooms/             # Справочник помещений
│   │   │   ├── rooms.module.ts
│   │   │   ├── rooms.controller.ts
│   │   │   ├── rooms.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── teachers/          # Справочник преподавателей
│   │   │   ├── teachers.module.ts
│   │   │   ├── teachers.controller.ts
│   │   │   ├── teachers.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── studios/           # Студии и группы
│   │   │   ├── studios.module.ts
│   │   │   ├── studios.controller.ts
│   │   │   ├── studios.service.ts
│   │   │   ├── groups.controller.ts
│   │   │   ├── groups.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── schedule/          # Расписание
│   │   │   ├── schedule.module.ts
│   │   │   ├── schedule.controller.ts
│   │   │   ├── schedule.service.ts
│   │   │   ├── conflict-checker.service.ts
│   │   │   ├── recurrence.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── attendance/        # Посещаемость
│   │   │   ├── attendance.module.ts
│   │   │   ├── attendance.controller.ts
│   │   │   ├── attendance.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── subscriptions/     # Абонементы
│   │   │   ├── subscriptions.module.ts
│   │   │   ├── subscription-types.controller.ts
│   │   │   ├── subscription-types.service.ts
│   │   │   ├── subscriptions.controller.ts
│   │   │   ├── subscriptions.service.ts
│   │   │   ├── subscription-validator.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── rentals/           # Аренда помещений
│   │   │   ├── rentals.module.ts
│   │   │   ├── rentals.controller.ts
│   │   │   ├── rentals.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── events/            # Мероприятия
│   │   │   ├── events.module.ts
│   │   │   ├── events.controller.ts
│   │   │   ├── events.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── payments/          # Платежи
│   │   │   ├── payments.module.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── yukassa.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── salary/            # Расчет ЗП
│   │   │   ├── salary.module.ts
│   │   │   ├── salary.controller.ts
│   │   │   ├── salary.service.ts
│   │   │   ├── teacher-salary.service.ts
│   │   │   ├── manager-salary.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── reports/           # Отчеты
│   │   │   ├── reports.module.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.service.ts
│   │   │   ├── financial-reports.service.ts
│   │   │   ├── attendance-reports.service.ts
│   │   │   ├── room-reports.service.ts
│   │   │   └── employee-reports.service.ts
│   │   │
│   │   ├── notifications/     # Email уведомления
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── email.service.ts
│   │   │   └── templates/
│   │   │       ├── receipt.hbs
│   │   │       ├── reminder.hbs
│   │   │       └── expiration.hbs
│   │   │
│   │   ├── database/          # Prisma конфигурация
│   │   │   ├── database.module.ts
│   │   │   └── prisma.service.ts
│   │   │
│   │   ├── common/            # Общие модули
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   └── logging.interceptor.ts
│   │   │   ├── pipes/
│   │   │   │   └── validation.pipe.ts
│   │   │   └── decorators/
│   │   │
│   │   └── config/            # Конфигурация
│   │       ├── config.module.ts
│   │       └── configuration.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── test/                  # E2E тесты
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   │
│   ├── .env
│   ├── .env.example
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── .dockerignore
│
├── nginx/                      # Nginx конфигурация (для продакшена)
│   ├── nginx.conf
│   └── Dockerfile
│
├── certbot/                    # SSL сертификаты
│   ├── conf/
│   └── www/
│
└── backups/                    # Резервные копии БД
    └── .gitkeep
```

---

## Детальная структура модулей

### Frontend: Next.js 14 App Router

**Ключевые особенности:**
- App Router с группами маршрутов
- Server Components по умолчанию
- Client Components с `"use client"`
- shadcn/ui компоненты
- TanStack Query для состояния сервера
- Zustand для клиентского состояния

**Пример структуры страницы:**

```typescript
// frontend/src/app/(dashboard)/clients/page.tsx
import { ClientList } from '@/components/clients/ClientList';

export default async function ClientsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Клиенты</h1>
      <ClientList />
    </div>
  );
}
```

**Пример API client:**

```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const clientsApi = {
  getAll: (params?: any) => api.get('/clients', { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.patch(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};
```

---

### Backend: NestJS Architecture

**Ключевые особенности:**
- Модульная архитектура
- Dependency Injection
- Prisma ORM для работы с БД
- JWT аутентификация
- Guards для защиты роутов
- DTOs для валидации

**Пример модуля:**

```typescript
// backend/src/clients/clients.module.ts
import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ClientRelationsService } from './client-relations.service';
import { ClientImportService } from './client-import.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    ClientRelationsService,
    ClientImportService,
  ],
  exports: [ClientsService],
})
export class ClientsModule {}
```

**Пример контроллера:**

```typescript
// backend/src/clients/clients.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('admin', 'manager')
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @Roles('admin', 'manager')
  findAll(@Query() query: any) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
```

**Пример сервиса:**

```typescript
// backend/src/clients/clients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    return this.prisma.client.create({
      data: createClientDto,
    });
  }

  async findAll(query: any) {
    const { search, status, page = 1, limit = 20 } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            subscriptionType: true,
          },
        },
        relations: {
          include: {
            relatedClient: true,
          },
        },
        attendances: {
          include: {
            schedule: {
              include: {
                group: {
                  include: {
                    studio: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    return this.prisma.client.update({
      where: { id },
      data: updateClientDto,
    });
  }

  async remove(id: string) {
    return this.prisma.client.delete({
      where: { id },
    });
  }
}
```

---

## Соглашения о коде

### TypeScript
- Строгий режим включен
- Использование типов вместо `any`
- Интерфейсы для описания структур данных

### Naming Conventions
- Компоненты: PascalCase (ClientCard.tsx)
- Файлы: kebab-case (client-card.tsx) или PascalCase для компонентов
- Переменные и функции: camelCase
- Константы: UPPER_SNAKE_CASE
- CSS классы: kebab-case

### Git
- Ветки: `feature/`, `bugfix/`, `hotfix/`
- Коммиты: conventional commits (`feat:`, `fix:`, `docs:`, etc.)

---

## Команды для разработки

### Инициализация проекта

```bash
# Frontend (Next.js)
cd frontend
npm install
npx shadcn-ui@latest init

# Backend (NestJS)
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

### Разработка

```bash
# С Docker Compose
docker-compose up -d

# Или локально

# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run start:dev

# База данных
docker-compose up db -d
```

### Тестирование

```bash
# Frontend
cd frontend
npm run test
npm run test:e2e

# Backend
cd backend
npm run test
npm run test:e2e
```

### Линтинг и форматирование

```bash
# Frontend
npm run lint
npm run format

# Backend
npm run lint
npm run format
```

---

## Git Workflow

1. Создать feature ветку:
```bash
git checkout -b feature/client-card
```

2. Разработка и коммиты:
```bash
git add .
git commit -m "feat: add client card component"
```

3. Push и создание PR:
```bash
git push origin feature/client-card
```

4. После ревью - merge в main

---

## Развертывание

См. подробности в [DOCKER_SETUP.md](./DOCKER_SETUP.md)

```bash
# Продакшен
docker-compose -f docker-compose.prod.yml up -d --build
```
