# Стандарты кодирования проекта Artsvao

> **Версия:** 1.0
> **Дата обновления:** 2025-01-17
> **Статус:** Актуальный

---

## Содержание

1. [Введение](#1-введение)
2. [Clean Code & Архитектурные принципы](#2-clean-code--архитектурные-принципы)
3. [Performance & Optimization](#3-performance--optimization)
4. [Backend стандарты (NestJS)](#4-backend-стандарты-nestjs)
5. [Frontend стандарты (Next.js)](#5-frontend-стандарты-nextjs)
6. [Database стандарты (Prisma)](#6-database-стандарты-prisma)
7. [Code Documentation](#7-code-documentation)
8. [Testing & Quality](#8-testing--quality)
9. [Общие стандарты](#9-общие-стандарты)
10. [DevOps & Configuration](#10-devops--configuration)

---

## 1. Введение

### 1.1 Цель документа

Этот документ определяет стандарты кодирования для проекта **Artsvao** — системы управления культурным центром. Соблюдение этих стандартов обеспечивает:

- ✅ **Читаемость кода** — новые разработчики быстрее вникают в проект
- ✅ **Поддерживаемость** — изменения вносятся легче и безопаснее
- ✅ **Качество** — меньше багов, лучше производительность
- ✅ **Консистентность** — весь код выглядит как написанный одним человеком

### 1.2 Технологический стек

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| **Backend** | NestJS | 10.x |
| **Frontend** | Next.js (App Router) | 14.x |
| **Database** | PostgreSQL + Prisma ORM | 16 + 6.x |
| **Language** | TypeScript | 5.x |
| **UI Library** | shadcn/ui + Tailwind CSS | Latest |
| **State Management** | React Query + Zustand | 5.x + 5.x |
| **Containerization** | Docker + Docker Compose | Latest |

### 1.3 Основные принципы разработки

Наш код следует проверенным принципам разработки ПО:

- **SOLID** — архитектурные принципы для гибкого и расширяемого кода
- **DRY** (Don't Repeat Yourself) — избегаем дублирования логики
- **KISS** (Keep It Simple, Stupid) — простота превыше сложности
- **YAGNI** (You Aren't Gonna Need It) — не пишем код "на будущее"
- **Separation of Concerns** — каждый модуль отвечает за свою область

---

## 2. Clean Code & Архитектурные принципы

### 2.1 SOLID принципы

#### Single Responsibility Principle (SRP)

**Каждый класс должен иметь только одну причину для изменения.**

```typescript
// ❌ Плохо - класс делает слишком много
@Injectable()
export class ClientsService {
  async create(dto: CreateClientDto) { /* ... */ }
  async sendEmail(clientId: string, subject: string) { /* ... */ } // Не его ответственность!
  async generateReport(clientId: string) { /* ... */ } // Не его ответственность!
}

// ✅ Хорошо - каждый класс делает одно дело
@Injectable()
export class ClientsService {
  async create(dto: CreateClientDto) { /* ... */ }
  async findOne(id: string) { /* ... */ }
  async update(id: string, dto: UpdateClientDto) { /* ... */ }
}

@Injectable()
export class EmailService {
  async sendClientWelcomeEmail(clientId: string) { /* ... */ }
}

@Injectable()
export class ReportsService {
  async generateClientReport(clientId: string) { /* ... */ }
}
```

**Примеры из проекта:**
- ✅ `ConflictCheckerService` (`backend/src/shared/conflict-checker.service.ts`) — только проверка конфликтов
- ✅ `AuditLogService` — только логирование действий
- ✅ `PrismaService` — только работа с БД

#### Dependency Injection (DI)

**Зависимости передаются извне, а не создаются внутри класса.**

```typescript
// ❌ Плохо - создание зависимости внутри
export class ClientsService {
  private prisma = new PrismaClient(); // Жесткая связь!

  async findAll() {
    return this.prisma.client.findMany();
  }
}

// ✅ Хорошо - инъекция зависимости
@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService, // Передается через DI
    private auditLog: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.client.findMany();
  }
}
```

**Преимущества:**
- Легко тестировать (можно подменить mock'ами)
- Легко менять реализацию
- NestJS сам управляет жизненным циклом

#### Interface Segregation

**Не создавайте "толстые" интерфейсы — разделяйте на специализированные.**

```typescript
// ❌ Плохо - один огромный DTO для всего
export class ClientDto {
  // Поля для создания
  firstName: string;
  lastName: string;
  // Поля для фильтрации
  search?: string;
  status?: ClientStatus;
  page?: number;
  // Поля для обновления
  notes?: string;
  // ... слишком много ответственности
}

// ✅ Хорошо - разделенные DTO
export class CreateClientDto {
  firstName: string;
  lastName: string;
  phone: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
  status?: ClientStatus;
}

export class ClientFilterDto {
  search?: string;
  status?: ClientStatus;
  page?: number;
  limit?: number;
}
```

### 2.2 DRY (Don't Repeat Yourself)

#### Переиспользование через Shared Services

```typescript
// ❌ Плохо - дублирование логики проверки конфликтов
// В schedules.service.ts
async create(dto: CreateScheduleDto) {
  const existingSchedules = await this.prisma.schedule.findMany({ /* ... */ });
  const existingRentals = await this.prisma.rental.findMany({ /* ... */ });
  // Дублируем логику проверки времени
  if (this.hasTimeConflict(existingSchedules, dto.startTime, dto.endTime)) {
    throw new ConflictException('Time conflict');
  }
}

// В events.service.ts
async create(dto: CreateEventDto) {
  // Та же самая логика дублируется!
  const existingEvents = await this.prisma.event.findMany({ /* ... */ });
  // ...
}

// ✅ Хорошо - общий сервис для проверки конфликтов
@Injectable()
export class ConflictCheckerService {
  async checkConflicts(params: ConflictCheckParams): Promise<void> {
    // Единая логика для всех типов событий
  }
}

// Использование в разных сервисах
export class SchedulesService {
  constructor(private conflictChecker: ConflictCheckerService) {}

  async create(dto: CreateScheduleDto) {
    await this.conflictChecker.checkConflicts({
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      roomIds: [dto.roomId],
    });
    // ...
  }
}
```

**Примеры переиспользования в проекте:**
- ✅ `ConflictCheckerService` — используется в schedules, events, rentals
- ✅ `AuditLogService` — используется во всех модулях для логирования
- ✅ React hooks (`useClients`, `useAuth`) — переиспользуются на разных страницах
- ✅ UI компоненты (`Button`, `Dialog`, `Table`) — единый набор shadcn/ui

### 2.3 KISS (Keep It Simple, Stupid)

**Простое решение всегда лучше сложного.**

```typescript
// ❌ Плохо - излишняя сложность
export class DateHelper {
  static convertToUserTimezone(
    date: Date,
    timezone: string,
    format: string,
    locale: string = 'ru-RU',
    options?: Intl.DateTimeFormatOptions
  ): string {
    // Сложная логика с множеством edge cases
    const converter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      ...options,
    });
    // ... 50 строк кода
  }
}

// ✅ Хорошо - простое решение (YAGNI - пока не нужна такая сложность)
export class DateHelper {
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // Простой формат YYYY-MM-DD
  }
}
```

**Правила KISS:**
- Не используйте сложные паттерны там, где можно обойтись простым решением
- Не абстрагируйте до тех пор, пока не увидите повторение 3+ раз
- Не оптимизируйте преждевременно

### 2.4 Разделение ответственности

#### Backend: Controller → Service → Repository (Prisma)

```typescript
// Controller - только HTTP слой
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(@Query() filterDto: ClientFilterDto) {
    return this.clientsService.findAll(filterDto); // Делегирует сервису
  }
}

// Service - бизнес-логика
@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filterDto: ClientFilterDto) {
    // Валидация, трансформация, бизнес-логика
    const where = this.buildWhereClause(filterDto);
    return this.prisma.client.findMany({ where }); // Делегирует Prisma
  }

  private buildWhereClause(filterDto: ClientFilterDto) {
    // Бизнес-логика построения запроса
  }
}
```

#### Frontend: Page → Component → Hook → API

```typescript
// Page - композиция компонентов
export default function ClientsPage() {
  return (
    <div>
      <ClientsHeader />
      <ClientsFilters />
      <ClientsTable />
    </div>
  );
}

// Component - UI логика
export function ClientsTable() {
  const { data, isLoading } = useClients(); // Делегирует хуку

  if (isLoading) return <Skeleton />;
  return <Table data={data} />;
}

// Hook - управление данными
export function useClients(filters?: ClientFilterParams) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: () => getClients(filters), // Делегирует API клиенту
  });
}

// API Client - HTTP запросы
export async function getClients(params?: ClientFilterParams) {
  const { data } = await apiClient.get('/clients', { params });
  return data;
}
```

---

## 3. Performance & Optimization

### 3.1 Backend оптимизация

#### 3.1.1 Database Queries — Promise.all для параллельных запросов

```typescript
// ❌ Плохо - последовательные запросы (медленно!)
async findOne(id: string) {
  const client = await this.prisma.client.findUnique({ where: { id } });
  const subscriptions = await this.prisma.subscription.findMany({
    where: { clientId: id }
  });
  const payments = await this.prisma.payment.findMany({
    where: { clientId: id }
  });

  return { client, subscriptions, payments };
}
// Время выполнения: T1 + T2 + T3

// ✅ Хорошо - параллельные запросы
async findOne(id: string) {
  const [client, subscriptions, payments] = await Promise.all([
    this.prisma.client.findUnique({ where: { id } }),
    this.prisma.subscription.findMany({ where: { clientId: id } }),
    this.prisma.payment.findMany({ where: { clientId: id } }),
  ]);

  return { client, subscriptions, payments };
}
// Время выполнения: max(T1, T2, T3) - в 2-3 раза быстрее!
```

**Пример из проекта:** `backend/src/shared/conflict-checker.service.ts:31-37`
```typescript
const [schedules, rentals, events, reservations] = await Promise.all([
  this.prisma.schedule.findMany({ where }),
  this.prisma.rental.findMany({ where }),
  this.prisma.event.findMany({ where }),
  this.prisma.reservation.findMany({ where }),
]);
```

#### 3.1.2 Select/Include Optimization — загружайте только нужное

```typescript
// ❌ Плохо - загружаем все поля и все связи
const client = await this.prisma.client.findUnique({
  where: { id },
  include: {
    subscriptions: true,  // Все подписки без лимита!
    payments: true,       // Все платежи без лимита!
    relations: true,      // Все связи без лимита!
  },
});
// Может вернуть мегабайты данных!

// ✅ Хорошо - загружаем только нужные поля с лимитами
const client = await this.prisma.client.findUnique({
  where: { id },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    leadSource: {
      select: { id: true, name: true }, // Только нужные поля
    },
    subscriptions: {
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 5, // Лимит!
      select: {
        id: true,
        validMonth: true,
        status: true,
      },
    },
    payments: {
      orderBy: { createdAt: 'desc' },
      take: 10, // Лимит!
    },
  },
});
// Возвращает только необходимые данные
```

**Правило:** Всегда используйте `take` для связанных коллекций.

#### 3.1.3 Pagination — всегда с лимитами

```typescript
// ❌ Плохо - без пагинации
async findAll() {
  return this.prisma.client.findMany(); // Может вернуть 100K записей!
}

// ✅ Хорошо - с пагинацией и мета-информацией
async findAll(filterDto: ClientFilterDto) {
  const { page = 1, limit = 20 } = filterDto;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.client.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.client.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

**Константы пагинации:**
```typescript
// backend/src/common/constants/pagination.constants.ts
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
```

#### 3.1.4 Database Indexing — индексируйте часто используемые поля

```prisma
model Client {
  id        String   @id @default(uuid())
  firstName String
  lastName  String
  phone     String
  email     String?
  status    ClientStatus @default(ACTIVE)
  createdAt DateTime @default(now())

  // Индексы для быстрого поиска
  @@index([phone])          // Поиск по телефону
  @@index([email])          // Поиск по email
  @@index([lastName])       // Сортировка по фамилии
  @@index([status])         // Фильтрация по статусу
  @@index([createdAt])      // Сортировка по дате
  @@index([status, createdAt]) // Composite index для частого запроса
}
```

**Когда нужен индекс:**
- Поля в `where` clause
- Поля в `orderBy`
- Foreign keys
- Поля для поиска

#### 3.1.5 N+1 Problem — используйте include вместо отдельных запросов

```typescript
// ❌ Плохо - N+1 запросов
async getClientsWithLeadSources() {
  const clients = await this.prisma.client.findMany();

  // N запросов в цикле!
  for (const client of clients) {
    client.leadSource = await this.prisma.leadSource.findUnique({
      where: { id: client.leadSourceId },
    });
  }

  return clients;
}
// 1 запрос для клиентов + N запросов для leadSource = N+1 проблема

// ✅ Хорошо - один запрос с join
async getClientsWithLeadSources() {
  return this.prisma.client.findMany({
    include: {
      leadSource: { select: { id: true, name: true } },
    },
  });
}
// Всего 1 запрос с JOIN
```

### 3.2 Frontend оптимизация

#### 3.2.1 React Performance — мемоизация

```typescript
// ❌ Плохо - пересоздается при каждом рендере
export function ClientsTable({ clients }: ClientsTableProps) {
  const filteredClients = clients.filter(c => c.status === 'ACTIVE'); // Пересчитывается каждый рендер!

  const handleEdit = (id: string) => { /* ... */ }; // Новая функция каждый рендер!

  return <Table data={filteredClients} onEdit={handleEdit} />;
}

// ✅ Хорошо - мемоизация вычислений и функций
export function ClientsTable({ clients }: ClientsTableProps) {
  // Вычисляется только если clients изменился
  const filteredClients = useMemo(
    () => clients.filter(c => c.status === 'ACTIVE'),
    [clients]
  );

  // Функция создается только один раз
  const handleEdit = useCallback((id: string) => {
    // ...
  }, []);

  return <Table data={filteredClients} onEdit={handleEdit} />;
}

// ✅ Еще лучше - мемоизация самого компонента
export const ClientsTable = React.memo(function ClientsTable({ clients }: ClientsTableProps) {
  // Компонент не перерендеривается если props не изменились
  // ...
});
```

**Когда использовать:**
- `useMemo` — для дорогих вычислений (фильтрация, сортировка больших массивов)
- `useCallback` — для функций, передаваемых в дочерние компоненты
- `React.memo` — для компонентов, которые часто рендерятся с теми же props

#### 3.2.2 Debouncing/Throttling для поиска

```typescript
// ❌ Плохо - запрос на каждое нажатие клавиши
export function ClientsSearch() {
  const [search, setSearch] = useState('');
  const { data } = useClients({ search }); // Запрос на каждый символ!

  return <Input value={search} onChange={(e) => setSearch(e.target.value)} />;
}

// ✅ Хорошо - debounce для уменьшения запросов
export function ClientsSearch() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // Запрос только после 300ms паузы

    return () => clearTimeout(timer);
  }, [search]);

  const { data } = useClients({ search: debouncedSearch });

  return <Input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

#### 3.2.3 React Query — автоматическое кеширование

```typescript
// ✅ React Query автоматически кеширует данные
export function useClients(filters?: ClientFilterParams) {
  return useQuery({
    queryKey: ['clients', filters], // Кеш по ключу
    queryFn: () => getClients(filters),
    staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
    cacheTime: 10 * 60 * 1000, // 10 минут - данные в кеше
  });
}

// При повторном вызове useClients с теми же фильтрами -
// данные берутся из кеша, запрос не делается!
```

**Оптимизации React Query:**
- Автоматический retry при ошибках
- Background refetch для актуальности данных
- Request deduplication (один запрос на одинаковые ключи)
- Optimistic updates для мгновенной обратной связи

#### 3.2.4 Lazy Loading компонентов

```typescript
// ✅ Ленивая загрузка тяжелых компонентов
import { lazy, Suspense } from 'react';

const ClientsChart = lazy(() => import('./components/clients-chart'));
const ReportsModal = lazy(() => import('./components/reports-modal'));

export function ClientsPage() {
  return (
    <div>
      <ClientsTable /> {/* Загружается сразу */}

      <Suspense fallback={<Skeleton />}>
        <ClientsChart /> {/* Загружается отдельным chunk */}
      </Suspense>
    </div>
  );
}
```

#### 3.2.5 Virtualization для больших списков

```typescript
// Для списков > 100 элементов используйте виртуализацию
import { useVirtualizer } from '@tanstack/react-virtual';

export function ClientsList({ clients }: { clients: Client[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: clients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Высота одного элемента
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <ClientCard key={virtualRow.key} client={clients[virtualRow.index]} />
        ))}
      </div>
    </div>
  );
}
```

---

## 4. Backend стандарты (NestJS)

### 4.1 Структура модулов

**Каждый модуль следует паттерну Module-Controller-Service-DTO:**

```
src/
└── clients/
    ├── clients.module.ts        # Модуль (imports, providers, controllers)
    ├── clients.controller.ts    # REST контроллер
    ├── clients.service.ts       # Бизнес-логика
    ├── clients.service.spec.ts  # Unit тесты
    └── dto/
        ├── create-client.dto.ts
        ├── update-client.dto.ts
        └── filter-client.dto.ts
```

**Пример модуля:**
```typescript
import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule], // Зависимости
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService], // Если нужно экспортировать
})
export class ClientsModule {}
```

### 4.2 Контроллеры — только HTTP слой

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request,
  UseGuards, ValidationPipe
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, ClientFilterDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clients')
@UseGuards(JwtAuthGuard) // Защита на уровне контроллера
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @Body(ValidationPipe) createClientDto: CreateClientDto,
    @Request() req,
  ) {
    return this.clientsService.create(createClientDto, req.user.id);
  }

  @Get()
  findAll(@Query(ValidationPipe) filterDto: ClientFilterDto) {
    return this.clientsService.findAll(filterDto);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.clientsService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateClientDto: UpdateClientDto,
    @Request() req,
  ) {
    return this.clientsService.update(id, updateClientDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.clientsService.remove(id, req.user.id);
  }
}
```

**Правила контроллеров:**
- ✅ Только декораторы и делегирование сервису
- ✅ Валидация через `ValidationPipe`
- ✅ RESTful endpoints (POST, GET, PATCH, DELETE)
- ✅ Специальные endpoints (`/search`) должны идти перед `/:id`
- ❌ Никакой бизнес-логики в контроллере

### 4.3 Сервисы — бизнес-логика

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService, AuditAction } from '../audit-log/audit-log.service';
import { CreateClientDto, UpdateClientDto, ClientFilterDto } from './dto';
import { ClientStatus } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(createClientDto: CreateClientDto, userId: string) {
    // Валидация бизнес-правил
    if (createClientDto.phone) {
      const existing = await this.prisma.client.findFirst({
        where: { phone: createClientDto.phone },
      });
      if (existing) {
        throw new BadRequestException('Client with this phone already exists');
      }
    }

    // Создание
    const client = await this.prisma.client.create({
      data: {
        firstName: createClientDto.firstName,
        lastName: createClientDto.lastName,
        phone: createClientDto.phone,
        email: createClientDto.email,
        leadSourceId: createClientDto.leadSourceId,
      },
      include: {
        leadSource: { select: { id: true, name: true } },
      },
    });

    // Audit log
    await this.auditLog.log({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Client',
      entityId: client.id,
      changes: { created: createClientDto },
    });

    return client;
  }

  async findAll(filterDto: ClientFilterDto) {
    const { search, status, page = 1, limit = 20 } = filterDto;
    const skip = (page - 1) * limit;

    // Динамическое построение where clause
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

    // Параллельные запросы для оптимизации
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leadSource: { select: { id: true, name: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        leadSource: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async remove(id: string, userId: string) {
    const client = await this.findOne(id); // Проверка существования

    // Soft delete
    const deletedClient = await this.prisma.client.update({
      where: { id },
      data: { status: ClientStatus.INACTIVE },
    });

    // Audit log
    await this.auditLog.log({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Client',
      entityId: id,
      changes: {
        deleted: {
          id,
          name: `${client.firstName} ${client.lastName}`
        }
      },
    });

    return deletedClient;
  }
}
```

**Правила сервисов:**
- ✅ Вся бизнес-логика здесь
- ✅ Валидация бизнес-правил
- ✅ Обработка ошибок (throw exceptions)
- ✅ Audit logging для важных операций
- ✅ Soft delete вместо физического удаления
- ✅ Promise.all для параллельных запросов

### 4.4 DTO — Data Transfer Objects

```typescript
import {
  IsString, IsEmail, IsOptional, IsEnum, IsInt, Min,
  MinLength, MaxLength, IsPhoneNumber
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientStatus } from '@prisma/client';

export class CreateClientDto {
  @IsString({ message: 'Имя должно быть строкой' })
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Имя не может быть длиннее 50 символов' })
  firstName: string;

  @IsString({ message: 'Фамилия должна быть строкой' })
  @MinLength(2, { message: 'Фамилия должна содержать минимум 2 символа' })
  @MaxLength(50, { message: 'Фамилия не может быть длиннее 50 символов' })
  lastName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsPhoneNumber('RU', { message: 'Некорректный номер телефона' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Некорректный email адрес' })
  email?: string;

  @IsOptional()
  @IsString()
  leadSourceId?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsOptional()
  @IsEnum(ClientStatus, { message: 'Некорректный статус клиента' })
  status?: ClientStatus;
}

export class ClientFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**Правила DTO:**
- ✅ Всегда используйте декораторы валидации
- ✅ Кастомные сообщения об ошибках на русском
- ✅ `@Type(() => Number)` для query параметров
- ✅ Дефолтные значения для page/limit
- ✅ UpdateDto через `PartialType(CreateDto)`

### 4.5 Error Handling

```typescript
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

// ✅ Используйте встроенные NestJS exceptions
throw new NotFoundException(`Client with ID ${id} not found`);
throw new BadRequestException('Invalid client data');
throw new ConflictException('Client with this email already exists');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('You don\'t have permission to access this resource');

// ✅ Для специфичных ошибок можно создать кастомные exceptions
export class ClientNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Client with ID ${id} not found`);
  }
}

export class TimeConflictException extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}
```

### 4.6 Аутентификация

**Global JwtAuthGuard с @Public декоратором:**

```typescript
// app.module.ts
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Глобальная защита
    },
  ],
})
export class AppModule {}

// auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Использование
@Controller('auth')
export class AuthController {
  @Public() // Открытый эндпоинт
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me') // Защищен глобальным guard
  getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }
}
```

---

## 5. Frontend стандарты (Next.js)

### 5.1 Структура приложения (App Router)

```
app/
├── layout.tsx                  # Root layout
├── page.tsx                    # Home page
├── globals.css                 # Global styles + Tailwind
├── (auth)/                     # Route group - аутентификация
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx              # Auth layout (без сайдбара)
└── (dashboard)/                # Route group - защищенные маршруты
    ├── layout.tsx              # Dashboard layout (с сайдбаром)
    ├── schedule/
    │   └── page.tsx
    ├── clients/
    │   ├── page.tsx
    │   ├── [id]/
    │   │   └── page.tsx
    │   └── components/
    │       ├── clients-table.tsx
    │       ├── client-form.tsx
    │       └── client-card.tsx
    └── admin/
        ├── rooms/
        └── teachers/
```

**Route Groups:**
- `(auth)` — открытые маршруты (login, register)
- `(dashboard)` — защищенные маршруты с единым layout

### 5.2 Компоненты

```typescript
'use client'; // Обязательно для клиентских компонентов

import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Client } from '@/lib/types/clients';

// ✅ Типизация props через interface
interface ClientCardProps {
  client: Client;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// ✅ Явное указание типов
export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(client.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{client.firstName} {client.lastName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{client.phone}</p>
        <p>{client.email}</p>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onEdit(client.id)}>Редактировать</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ Для page компонентов (только для app router)
export default function ClientsPage() {
  const { data, isLoading, error } = useClients();

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error.message}</div>;

  return (
    <div className="flex-1 space-y-4">
      <h1 className="text-3xl font-bold">Клиенты</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    </div>
  );
}
```

**Правила компонентов:**
- ✅ `'use client'` для клиентских компонентов (useState, useEffect, hooks)
- ✅ Server components по умолчанию (без `'use client'`)
- ✅ Типизация props через interface
- ✅ Destructuring props
- ✅ Условный рендеринг (loading, error states)
- ✅ shadcn/ui компоненты для UI

### 5.3 API Клиенты

```typescript
// lib/api/client.ts - базовый клиент
import axios from 'axios';
import { useAuthStore } from '../store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor - добавление токена
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - обновление токена при 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken, user } = response.data;
        useAuthStore.getState().setAuth(user, accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

```typescript
// lib/api/clients.ts - API для клиентов
import { apiClient } from './client';
import type { Client, CreateClientDto, ClientsListResponse } from '@/lib/types/clients';

export async function getClients(params?: ClientFilterParams): Promise<ClientsListResponse> {
  const { data } = await apiClient.get('/clients', { params });
  return data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await apiClient.get(`/clients/${id}`);
  return data;
}

export async function createClient(dto: CreateClientDto): Promise<Client> {
  const { data } = await apiClient.post('/clients', dto);
  return data;
}

export async function updateClient(id: string, dto: UpdateClientDto): Promise<Client> {
  const { data } = await apiClient.patch(`/clients/${id}`, dto);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await apiClient.delete(`/clients/${id}`);
}
```

### 5.4 React Hooks (React Query)

```typescript
// hooks/useClients.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClients, getClient, createClient, updateClient, deleteClient
} from '@/lib/api/clients';
import type { ClientFilterParams, CreateClientDto, UpdateClientDto } from '@/lib/types/clients';
import { useToast } from './use-toast';

export const useClients = (params?: ClientFilterParams) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => getClients(params),
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => getClient(id),
    enabled: !!id, // Запрос только если id есть
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateClientDto) => createClient(data),
    onSuccess: () => {
      // Инвалидация кеша
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Уведомление
      toast({
        title: 'Клиент создан',
        description: 'Новый клиент успешно добавлен',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось создать клиента',
      });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      updateClient(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
      toast({ title: 'Клиент обновлен' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось обновить клиента',
      });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Клиент удален' });
    },
  });
};
```

**Правила React Query:**
- ✅ `useQuery` для GET запросов
- ✅ `useMutation` для POST/PATCH/DELETE
- ✅ Автоматическая инвалидация кеша через `invalidateQueries`
- ✅ Toast уведомления для пользователя
- ✅ Обработка ошибок в `onError`

### 5.5 State Management (Zustand)

```typescript
// lib/store/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

**Использование:**
```typescript
function ProfilePage() {
  const { user, clearAuth } = useAuthStore();

  return (
    <div>
      <p>Привет, {user?.firstName}!</p>
      <button onClick={clearAuth}>Выйти</button>
    </div>
  );
}
```

### 5.6 Стилизация (Tailwind CSS)

```typescript
// ✅ Используйте Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h1 className="text-3xl font-bold text-gray-900">Заголовок</h1>
  <Button className="bg-primary hover:bg-primary/90">Кнопка</Button>
</div>

// ✅ Используйте CSS переменные для темизации
<Button className="bg-primary text-primary-foreground">
  Primary Button
</Button>

// ✅ Условные классы через cn() утилиту
import { cn } from '@/lib/utils';

<div className={cn(
  "p-4 rounded-lg",
  isActive && "bg-primary text-white",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
  Content
</div>

// ❌ Избегайте inline styles
<div style={{ padding: '16px', backgroundColor: 'white' }}> // Плохо
```

**CSS Variables (globals.css):**
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
  }
}
```

---

## 6. Database стандарты (Prisma)

### 6.1 Схема БД

```prisma
model Client {
  id                String           @id @default(uuid())
  firstName         String           @map("first_name")
  lastName          String           @map("last_name")
  middleName        String?          @map("middle_name")
  dateOfBirth       DateTime?        @map("date_of_birth") @db.Date
  phone             String
  email             String?
  status            ClientStatus     @default(ACTIVE)
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")

  // Relations
  leadSource        LeadSource?      @relation(fields: [leadSourceId], references: [id])
  subscriptions     Subscription[]
  payments          Payment[]

  // Indexes
  @@index([phone])
  @@index([email])
  @@index([status])
  @@index([lastName])
  @@index([status, createdAt]) // Composite index
  @@map("clients")
}

enum ClientStatus {
  ACTIVE
  INACTIVE
  VIP
}
```

**Правила схемы:**
- ✅ `@id @default(uuid())` для ID
- ✅ `@map("snake_case")` для полей БД
- ✅ `@@map("table_name")` для таблиц
- ✅ `createdAt` и `updatedAt` для всех таблиц
- ✅ Индексы на часто используемые поля
- ✅ Enum'ы для статусов
- ✅ `onDelete: Cascade` для каскадного удаления

### 6.2 Миграции

**Именование:** `YYYYMMDDHHMMSS_descriptive_name`

```bash
# Создание миграции
npx prisma migrate dev --name add_external_id_to_events

# Применение миграций в production
npx prisma migrate deploy

# Просмотр статуса миграций
npx prisma migrate status
```

**Правила миграций:**
- ✅ Описательные имена (`add_lead_sources`, `change_event_roomids_to_roomid`)
- ✅ Одна миграция = одно логическое изменение
- ✅ Всегда тестировать rollback
- ❌ Никогда не редактировать старые миграции в production

### 6.3 Query Optimization

```typescript
// ✅ Оптимизированные запросы
const client = await prisma.client.findUnique({
  where: { id },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    subscriptions: {
      where: { status: 'ACTIVE' },
      take: 5,
      orderBy: { createdAt: 'desc' },
    },
  },
});

// ✅ Batch operations вместо циклов
const userIds = ['id1', 'id2', 'id3'];
await prisma.user.updateMany({
  where: { id: { in: userIds } },
  data: { status: 'INACTIVE' },
});

// ❌ Плохо - N запросов в цикле
for (const id of userIds) {
  await prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
}
```

---

## 7. Code Documentation

### 7.1 Self-Documenting Code

**Код должен быть понятен без комментариев через:**

```typescript
// ❌ Плохо - нужны комментарии чтобы понять
const d = new Date(); // Дата создания
const u = await db.u.findOne({ w: { i: id } }); // Получение пользователя

// ✅ Хорошо - код сам себя объясняет
const createdAt = new Date();
const user = await prisma.user.findUnique({ where: { id } });
```

**Понятные имена функций:**
```typescript
// ❌ Плохо
function proc(d: any) { /* ... */ }

// ✅ Хорошо
function processClientData(client: Client) { /* ... */ }
function calculateMonthlyRevenue(payments: Payment[]): number { /* ... */ }
function isClientEligibleForDiscount(client: Client): boolean { /* ... */ }
```

### 7.2 Когда нужны комментарии

**1. Сложная бизнес-логика:**
```typescript
async checkConflicts(params: ConflictCheckParams): Promise<void> {
  // Проверяем конфликты расписания для всех комнат одновременно
  // вместо N×4 запросов делаем 4 параллельных запроса для оптимизации
  const [schedules, rentals, events, reservations] = await Promise.all([
    this.prisma.schedule.findMany({ where: { roomId: { in: roomIds } } }),
    this.prisma.rental.findMany({ where: { roomId: { in: roomIds } } }),
    this.prisma.event.findMany({ where: { roomId: { in: roomIds } } }),
    this.prisma.reservation.findMany({ where: { roomId: { in: roomIds } } }),
  ]);
}
```

**2. Неочевидные решения (объяснение "почему"):**
```typescript
// Используем setTimeout вместо setInterval для избежания накопления задач
// если предыдущая задача еще не завершена
setTimeout(() => this.syncData(), SYNC_INTERVAL);
```

**3. TODO/FIXME с контекстом:**
```typescript
// TODO: Добавить кеширование для этого запроса после внедрения Redis
// FIXME: Временное решение, переделать после миграции на новый API
```

**4. Регулярные выражения:**
```typescript
// Валидация российского номера телефона: +7 (XXX) XXX-XX-XX
const phoneRegex = /^\+7\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$/;
```

### 7.3 JSDoc для сложных функций

```typescript
/**
 * Проверяет конфликты расписания для указанных параметров
 *
 * @param params - Параметры для проверки конфликтов
 * @param params.date - Дата события
 * @param params.startTime - Время начала (HH:mm)
 * @param params.endTime - Время окончания (HH:mm)
 * @param params.roomIds - Массив ID комнат для проверки
 * @param params.teacherId - ID преподавателя (опционально)
 * @param params.excludeId - ID события для исключения из проверки (при обновлении)
 *
 * @throws {ConflictException} Если найдены конфликты по времени или комнатам
 * @throws {BadRequestException} Если переданы некорректные параметры
 *
 * @example
 * await conflictChecker.checkConflicts({
 *   date: '2025-01-20',
 *   startTime: '10:00',
 *   endTime: '12:00',
 *   roomIds: ['room-1', 'room-2'],
 *   teacherId: 'teacher-1',
 * });
 */
async checkConflicts(params: ConflictCheckParams): Promise<void> {
  // Implementation
}
```

---

## 8. Testing & Quality

### 8.1 Базовые требования

**Что должно быть покрыто тестами:**
- ✅ Критическая бизнес-логика (расчеты, валидация)
- ✅ Сложные алгоритмы (ConflictChecker)
- ✅ API endpoints (integration tests)
- ✅ Ключевые user flows (e2e tests)

**Что можно не тестировать:**
- ❌ Простые CRUD операции
- ❌ Тривиальные getters/setters
- ❌ Внешние библиотеки

### 8.2 Unit Tests (Jest)

```typescript
// clients.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a new client', async () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+79991234567',
      };

      const expectedClient = { id: '123', ...dto };
      jest.spyOn(prisma.client, 'create').mockResolvedValue(expectedClient);

      const result = await service.create(dto, 'user-id');

      expect(result).toEqual(expectedClient);
      expect(prisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining(dto),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if phone already exists', async () => {
      jest.spyOn(prisma.client, 'findFirst').mockResolvedValue({ id: '123' });

      await expect(
        service.create({ phone: '+79991234567' }, 'user-id')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

**AAA Pattern (Arrange-Act-Assert):**
```typescript
it('should calculate monthly revenue correctly', () => {
  // Arrange - подготовка данных
  const payments = [
    { amount: 1000 },
    { amount: 2000 },
    { amount: 1500 },
  ];

  // Act - выполнение действия
  const revenue = calculateMonthlyRevenue(payments);

  // Assert - проверка результата
  expect(revenue).toBe(4500);
});
```

### 8.3 Code Quality Tools

**Pre-commit hooks (husky + lint-staged):**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**ESLint + Prettier:**
```bash
# Проверка кода
npm run lint

# Автофикс
npm run lint:fix

# Форматирование
npm run format
```

---

## 9. Общие стандарты

### 9.1 Именование

| Что | Формат | Примеры |
|-----|--------|---------|
| **Файлы** | kebab-case | `clients.service.ts`, `create-client.dto.ts` |
| **Классы** | PascalCase | `ClientsService`, `CreateClientDto` |
| **Методы/функции** | camelCase | `findAll()`, `createClient()` |
| **Константы** | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `MAX_RETRIES` |
| **Переменные** | camelCase | `clientData`, `isLoading` |
| **Enum** | PascalCase | `ClientStatus`, `UserRole` |
| **Интерфейсы** | PascalCase | `Client`, `ClientFilterParams` |
| **React компоненты** | PascalCase | `ClientCard`, `ClientsTable` |
| **React hooks** | camelCase с `use` | `useClients`, `useAuth` |

### 9.2 Git Workflow

**Branch naming:**
```
feature/add-client-search
fix/client-phone-validation
refactor/optimize-conflict-checker
chore/update-dependencies
```

**Commit messages (Conventional Commits):**
```
feat(clients): add search functionality
fix(auth): fix refresh token expiration
docs(readme): update installation instructions
refactor(events): optimize conflict checking algorithm
test(clients): add unit tests for ClientsService
chore(deps): update @nestjs/common to 10.0.0
```

**Формат:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Типы:**
- `feat` — новая функциональность
- `fix` — исправление бага
- `docs` — изменения в документации
- `style` — форматирование кода (не влияет на логику)
- `refactor` — рефакторинг (не feat и не fix)
- `test` — добавление/изменение тестов
- `chore` — обновление зависимостей, конфигурации

**Pull Request template:**
```markdown
## Описание
Краткое описание изменений

## Тип изменений
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Чек-лист
- [ ] Код следует стандартам проекта
- [ ] Добавлены/обновлены тесты
- [ ] Все тесты проходят
- [ ] Обновлена документация
- [ ] Нет console.log в коде
```

### 9.3 Code Review Checklist

**Перед созданием PR:**
- [ ] Код отформатирован (prettier)
- [ ] Нет ошибок линтера (eslint)
- [ ] Нет TypeScript ошибок
- [ ] Все тесты проходят
- [ ] Нет console.log/debugger
- [ ] Обновлены типы TypeScript
- [ ] Добавлены тесты для новой функциональности

**При ревью:**
- [ ] Код читаем и понятен
- [ ] Соблюдены SOLID принципы
- [ ] Нет дублирования кода (DRY)
- [ ] Обработаны все edge cases
- [ ] Нет SQL injection / XSS уязвимостей
- [ ] Оптимальная производительность
- [ ] Понятные названия переменных/функций

---

## 10. DevOps & Configuration

### 10.1 Docker Best Practices

**Multi-stage builds:**
```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && \
    npx prisma generate && \
    npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/src/main"]
```

**Правила:**
- ✅ Multi-stage builds для минимизации размера
- ✅ Non-root user для безопасности
- ✅ .dockerignore для исключения лишних файлов
- ✅ Health checks для мониторинга

### 10.2 Environment Variables

```typescript
// ✅ Валидация env переменных при старте
import * as Joi from 'joi';

ConfigModule.forRoot({
  validationSchema: Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('15m'),
    PORT: Joi.number().default(3000),
  }),
}),
```

**Файл .env.example:**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/artsvao"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Application
NODE_ENV="development"
PORT=3000

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

### 10.3 TypeScript Configuration

**Backend (strict mode disabled for NestJS):**
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "skipLibCheck": true
  }
}
```

**Frontend (strict mode enabled):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## Заключение

Этот документ описывает стандарты кодирования проекта **Artsvao** на основе лучших практик индустрии и текущей кодовой базы. Соблюдение этих стандартов обеспечивает:

- **Качество** — меньше багов, лучше производительность
- **Поддерживаемость** — легче вносить изменения
- **Консистентность** — единый стиль кода
- **Скорость** — новые разработчики быстрее вникают в проект

### Следующие шаги

1. ✅ Ознакомить команду с документом
2. ✅ Настроить pre-commit hooks (husky + lint-staged)
3. ✅ Добавить CI/CD pipeline с проверками
4. ✅ Написать базовые тесты для критической логики
5. ✅ Провести code review существующего кода

### Полезные ссылки

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Clean Code (Robert Martin)](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)

---

**Версия документа:** 1.0
**Дата последнего обновления:** 2025-01-17
**Поддерживается:** Команда разработки Artsvao
