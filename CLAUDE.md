# Инструкции для Claude Code — Проект Artsvao

## Общая информация о проекте

**Artsvao** — система управления культурным центром (CRM + расписание + аренда помещений + абонементы).

**Технологический стек:**

| Компонент | Версия | Описание |
|-----------|--------|----------|
| **Backend** | NestJS 10.x | TypeScript, Express |
| **Frontend** | Next.js 14.x | App Router, React 18 |
| **Database** | PostgreSQL 16 | Облачная БД (Timeweb Cloud) |
| **ORM** | Prisma 6.x | 50+ моделей |
| **Process Manager** | PM2 | Fork mode |
| **Container** | Docker + Compose | 5 сервисов |

**Продакшн URL:** `https://crm.artsvao.ru`

---

## Архитектура Backend

### Модули (43 штуки)

**Основные Domain модули (28):**

| Модуль | Путь | Описание |
|--------|------|----------|
| `users` | `src/users/` | Пользователи системы |
| `auth` | `src/auth/` | JWT аутентификация |
| `clients` | `src/clients/` | CRM — клиенты |
| `client-relations` | `src/client-relations/` | Связи клиентов |
| `client-notes` | `src/client-notes/` | Заметки о клиентах |
| `client-documents` | `src/client-documents/` | Документы клиентов |
| `rooms` | `src/rooms/` | Помещения |
| `studios` | `src/studios/` | Студии |
| `teachers` | `src/teachers/` | Преподаватели |
| `groups` | `src/groups/` | Группы занятий |
| `schedules` | `src/schedules/` | Расписание |
| `events` | `src/events/` | Мероприятия |
| `event-types` | `src/event-types/` | Типы мероприятий |
| `reservations` | `src/reservations/` | Резервирования |
| `rentals` | `src/rentals/` | Аренда помещений |
| `rental-applications` | `src/rental-applications/` | Заявки на аренду |
| `services` | `src/services/` | Услуги |
| `service-categories` | `src/service-categories/` | Категории услуг |
| `subscriptions` | `src/subscriptions/` | Абонементы |
| `subscription-types` | `src/subscription-types/` | Типы абонементов |
| `invoices` | `src/invoices/` | Счета |
| `payments` | `src/payments/` | Платежи |
| `attendance` | `src/attendance/` | Посещаемость |
| `timesheets` | `src/timesheets/` | Табели |
| `lead-sources` | `src/lead-sources/` | Источники клиентов |
| `benefit-categories` | `src/benefit-categories/` | Льготные категории |
| `medical-certificates` | `src/medical-certificates/` | Медсправки |
| `nomenclature` | `src/nomenclature/` | Номенклатура |

**Интеграционные модули (7):**

| Модуль | Путь | Описание |
|--------|------|----------|
| `pyrus` | `src/integrations/pyrus/` | CRM Pyrus — синхронизация событий |
| `novofon` | `src/integrations/novofon/` | Телефония — Click-to-Call |
| `timepad` | `src/integrations/timepad/` | Импорт событий и билетов |
| `email` | `src/email/` | Отправка email (React Email) |
| `telegram` | `src/telegram/` | Telegram бот |
| `messages` | `src/messages/` | Внутренние сообщения |
| `notifications` | `src/notifications/` | Уведомления |

**Вспомогательные модули (8):**

| Модуль | Путь | Описание |
|--------|------|----------|
| `calendar` | `src/calendar/` | Календарь |
| `audit-log` | `src/audit-log/` | Логирование изменений |
| `unified-notifications` | `src/unified-notifications/` | Унифицированные уведомления |
| `health` | `src/health/` | Health checks |
| `workspaces` | `src/workspaces/` | Рабочие пространства |
| `archived-sales` | `src/archived-sales/` | Архив продаж |
| `prisma` | `src/prisma/` | Prisma ORM |
| `data-events` | `src/common/events/` | SSE real-time события |

---

### Shared Services

#### ConflictCheckerService (ЭТАЛОН ОПТИМИЗАЦИИ)
**Путь:** `backend/src/shared/conflict-checker.service.ts`

Проверяет конфликты времени для Schedule, Rental, Event, Reservation.
```typescript
// Паттерн: вместо N×4 запросов → 4 параллельных запроса
await this.conflictChecker.checkConflicts({
  date: dto.date,
  startTime: dto.startTime,
  endTime: dto.endTime,
  roomIds: [dto.roomId],
  teacherId?: dto.teacherId,
  excludeScheduleId?: scheduleId,
});
```

#### S3StorageService (Облачное хранилище)
**Путь:** `backend/src/common/services/s3-storage.service.ts`

- Поддержка AWS S3, Timeweb Cloud, DigitalOcean Spaces
- Автоматическое сжатие через Sharp (maxWidth=2048px, quality=80)
- Кэширование на 1 год
```typescript
const url = await this.s3.uploadImage(file, 'avatars');
await this.s3.deleteImage(existingUrl);
```

#### ReferenceDataCache (In-memory кэш)
**Путь:** `backend/src/common/cache/reference-data.cache.ts`

- Кэширует: LeadSource, BenefitCategory, ServiceCategory
- TTL: 5 минут
- @Global() модуль
```typescript
const sources = await this.cache.getLeadSources();
```

#### OptimisticLockUtil (Версионирование)
**Путь:** `backend/src/common/utils/optimistic-lock.util.ts`

```typescript
// Атомарное обновление с проверкой версии
await updateWithVersionCheck(tx, 'subscription', id, expectedVersion, data);
// Атомарное списание визитов
await atomicDecrementVisits(tx, subscriptionId, 1);
```

#### PhoneUtil (Нормализация телефонов)
**Путь:** `backend/src/common/utils/phone.util.ts`

```typescript
normalizePhone('8 (999) 123-45-67')  // → '+79991234567'
formatPhoneDisplay(phone)             // → '+7 (999) 123-45-67'
```

#### PrismaExceptionFilter
**Путь:** `backend/src/common/filters/prisma-exception.filter.ts`

Глобальный фильтр для обработки ошибок Prisma (P1001, P2002, P2025 и т.д.)

---

### DataEvents (SSE Real-time)
**Путь:** `backend/src/common/events/data-events.service.ts`

Server-Sent Events для синхронизации данных между клиентами:
```typescript
// Отправка события при изменении данных
this.dataEvents.emit('subscription', { action: 'update', id, data });
this.dataEvents.emit('attendance', { action: 'create', id, data });
```

**Поддерживаемые события:** subscription, attendance, invoice, payment, schedule, medicalCertificate, client, group

---

### Health Checks
```
GET /api/health           — основная проверка
GET /api/health/liveness  — Kubernetes liveness probe
GET /api/health/readiness — Kubernetes readiness probe
GET /api/health/detailed  — детальная диагностика с метриками
```

---

## Архитектура Frontend

### Структура страниц (40+)

**Auth Layout (`app/(auth)/`):**
- `login/` — страница входа
- `forgot-password/` — восстановление пароля
- `reset-password/` — сброс пароля
- `set-password/` — установка пароля

**Dashboard Layout (`app/(dashboard)/`):**

| Путь | Описание |
|------|----------|
| `clients/` | Список клиентов |
| `clients/[id]/` | Детали клиента |
| `clients/new/` | Создание клиента |
| `subscriptions/` | Абонементы |
| `payments/` | Платежи |
| `invoices/` | Счета |
| `invoices/[id]/` | Детали счета |
| `schedule/` | Расписание |
| `schedule-planner/` | Планировщик расписания |
| `room-planner/` | Планировщик комнат |
| `groups/` | Группы |
| `groups/[id]/` | Детали группы |
| `rentals/` | Аренда |
| `rentals/[id]/` | Детали аренды |
| `rentals/new/` | Новая аренда |
| `rentals/workspaces/` | Рабочие пространства |
| `medical-certificates/` | Медсправки |
| `messages/` | Сообщения |
| `timesheets/` | Табели |
| `users/` | Пользователи |
| `profile/` | Профиль |
| `settings/` | Настройки |
| `nomenclature/` | Номенклатура |

**Admin Layout (`app/(dashboard)/admin/`):**

| Путь | Описание |
|------|----------|
| `benefit-categories/` | Категории льгот |
| `event-types/` | Типы событий |
| `events/` | События |
| `groups/` | Управление группами |
| `notifications/` | Уведомления |
| `rooms/` | Комнаты |
| `services/` | Услуги |
| `studios/` | Студии |
| `subscription-types/` | Типы абонементов |
| `teachers/` | Преподаватели |
| `telephony/` | Телефония (Novofon) |

**Integrations (`app/(dashboard)/integrations/`):**
- `pyrus/` — интеграция с Pyrus CRM

---

### Hooks (45+)

**CRUD Hooks (используют React Query):**
```typescript
// Паттерн использования
const { data, isLoading } = useClients(filters);
const createMutation = useCreateClient();
const updateMutation = useUpdateClient();
```

| Hook | Файл | Описание |
|------|------|----------|
| `useClients` | `hooks/useClients.ts` | Клиенты CRUD |
| `useClientNotes` | `hooks/useClientNotes.ts` | Заметки клиентов |
| `useSubscriptions` | `hooks/useSubscriptions.ts` | Абонементы |
| `useInvoices` | `hooks/useInvoices.ts` | Счета |
| `usePayments` | `hooks/usePayments.ts` | Платежи |
| `useRentals` | `hooks/useRentals.ts` | Аренда |
| `useRentalApplications` | `hooks/useRental-applications.ts` | Заявки на аренду |
| `useEvents` | `hooks/useEvents.ts` | События |
| `useSchedules` | `hooks/useSchedules.ts` | Расписание |
| `useReservations` | `hooks/useReservations.ts` | Резервирования |
| `useGroups` | `hooks/use-groups.ts` | Группы |
| `useTeachers` | `hooks/use-teachers.ts` | Преподаватели |
| `useRooms` | `hooks/use-rooms.ts` | Комнаты |
| `useStudios` | `hooks/use-studios.ts` | Студии |
| `useServices` | `hooks/use-services.ts` | Услуги |
| `useUsers` | `hooks/use-users.ts` | Пользователи |
| `useAttendance` | `hooks/use-attendance.ts` | Посещаемость |
| `useTimesheets` | `hooks/use-timesheets.ts` | Табели |
| `useMedicalCertificates` | `hooks/use-medical-certificates.ts` | Медсправки |

**Специализированные Hooks:**

| Hook | Файл | Описание |
|------|------|----------|
| `useAuth` | `hooks/use-auth.ts` | Аутентификация |
| `useProfile` | `hooks/use-profile.ts` | Профиль пользователя |
| `useRoomPlanner` | `hooks/use-room-planner.ts` | Планировщик комнат (19K+ строк) |
| `useSchedulePlanner` | `hooks/use-schedule-planner.ts` | Планировщик расписания |
| `useDataEvents` | `hooks/use-data-events.ts` | SSE real-time события |
| `useNotifications` | `hooks/use-notifications.ts` | Уведомления |
| `useNovofon` | `hooks/use-novofon.ts` | Телефония |
| `useCalendar` | `hooks/use-calendar.ts` | Календарь |
| `useActivityMove` | `hooks/use-activity-move.ts` | Drag-drop активностей |
| `useActivityPaste` | `hooks/use-activity-paste.ts` | Copy-paste активностей |

---

### Zustand Stores

| Store | Путь | Описание |
|-------|------|----------|
| `authStore` | `lib/store/auth-store.ts` | Auth с persistence (localStorage) |
| `conflictStore` | `lib/stores/conflict-store.ts` | Оптимистичная блокировка |
| `activityClipboardStore` | `lib/stores/activity-clipboard-store.ts` | Clipboard для активностей |
| `messagesStore` | `lib/stores/messages-store.ts` | WebSocket сообщения |
| `navigationStore` | `lib/stores/navigation-store.ts` | Состояние навигации |
| `roomPlannerScaleStore` | `lib/stores/room-planner-scale-store.ts` | Масштаб планировщика |
| `roomPlannerScrollStore` | `lib/stores/room-planner-scroll-store.ts` | Скролл планировщика |
| `roomPlannerSortStore` | `lib/stores/room-planner-sort-store.ts` | Сортировка комнат |

---

### API Клиенты (35+)

**Путь:** `frontend/lib/api/`

```typescript
// Базовый клиент с автоматическим refresh token
import { apiClient } from '@/lib/api/client';

// Использование
const response = await apiClient.get('/clients');
const data = await apiClient.post('/clients', dto);
```

**Особенности:**
- Автоматический Bearer token
- Refresh token при 401
- Обработка 409 Conflict (оптимистичная блокировка)
- DataConflictDialog при конфликте версий

---

### Оптимистичная блокировка (Frontend)

При 409 Conflict показывается `DataConflictDialog`:
```typescript
// API возвращает:
{
  entity: 'Subscription',
  entityId: 'uuid',
  expectedVersion: 5,
  currentVersion: 6,
  serverData: { ... }
}

// Пользователь выбирает:
// - Использовать свои данные (retry с force)
// - Использовать серверные данные (обновить форму)
```

---

## Интеграции

### Pyrus CRM
**Путь:** `backend/src/integrations/pyrus/`

- Синхронизация мероприятий
- Импорт событий в локальную БД
- Разрешение конфликтов (EventType, Room)
```typescript
await this.pyrus.importEvents();
await this.pyrus.syncConflicts();
```

### Novofon (Телефония)
**Путь:** `backend/src/integrations/novofon/`

- Click-to-Call из CRM
- Инициирование исходящих звонков
```typescript
await this.novofon.initiateCall({ phoneNumber, userId });
```

### Timepad
**Путь:** `backend/src/integrations/timepad/`

- Импорт заказов и билетов
- Синхронизация событий
```typescript
await this.timepad.importOrders();
```

### Telegram Bot
**Путь:** `backend/src/telegram/`

- Webhook обработка
- Уведомления клиентам
- Интеграция с S3 для медиа
```typescript
await this.telegram.sendNotification(chatId, message);
```

### Email (React Email)
**Путь:** `backend/src/email/`

- Шаблоны на React
- Восстановление пароля
- Уведомления о событиях
```typescript
await this.email.sendPasswordReset(email, token, firstName);
```

### YooKassa (Платежи)
- Интеграция для онлайн-оплаты
- Webhook для подтверждения платежей

### AWS S3 / Timeweb Cloud
- Хранение изображений
- Автоматическое сжатие
- CDN с кэшированием

---

## Prisma модели (50+)

### Основные сущности

**Users & Auth:**
- User, UserInvitation, PasswordResetToken, RefreshToken

**Clients:**
- Client, ClientNote, ClientDocument, ClientRelation

**Organizations:**
- BenefitCategory, LeadSource, ServiceCategory, SystemSettings

**Scheduling:**
- Group, GroupMember, Teacher, Studio, Schedule, Attendance

**Services:**
- Service, IndependentService, ServiceSale, Compensation

**Financial:**
- Subscription, SubscriptionType, Invoice, InvoiceItem, Payment, Rental

**Events:**
- Event, EventType, Reservation

**Communication:**
- TelegramAccount, Conversation, Message, NotificationTemplate, Notification

**Documents:**
- MedicalCertificate, RentalApplication, CallLog

### Важные Enums

```prisma
enum UserRole { ADMIN, MANAGER, EMPLOYEE }
enum ClientStatus { ACTIVE, INACTIVE, ARCHIVED }
enum SubscriptionStatus { ACTIVE, FROZEN, EXPIRED, CANCELLED }
enum PaymentStatus { PENDING, COMPLETED, FAILED, REFUNDED }
enum AttendanceStatus { PLANNED, ATTENDED, MISSED, CANCELLED }
enum InvoiceStatus { DRAFT, SENT, PAID, OVERDUE, CANCELLED }
```

---

## Деплой и инфраструктура

### Docker Compose (5 сервисов)

| Сервис | Image | Port | RAM |
|--------|-------|------|-----|
| `postgres` | postgres:16-alpine | 5432 | 512M |
| `backend` | NestJS (custom) | 3000 | 2048M |
| `frontend` | Next.js (custom) | 3001 | 512M |
| `nginx` | nginx:alpine | 80, 443 | 256M |
| `certbot` | certbot/certbot | - | - |

### PM2 Configuration
**Путь:** `backend/ecosystem.config.js`

```javascript
instances: 1          // Fork mode (Prisma стабильнее)
max_memory_restart: '700M'
kill_timeout: 45000   // Graceful shutdown
```

### Деплой
**Скрипт:** `deploy-unified.sh`

```bash
./deploy-unified.sh              # Полный деплой
./deploy-unified.sh --fast       # Быстрый деплой
./deploy-unified.sh --no-backup  # Без бэкапа
```

**Фазы деплоя:**
1. Pre-validation
2. Create Backup
3. SSL Certificates Backup
4. File Sync (rsync)
5. Docker Build (BuildKit)
6. Database Migrations
7. Start Services
8. Health Checks

---

## Стандарты кодирования

**При написании любого кода ВСЕГДА следуйте стандартам из документа:**

**[CODING_STANDARDS.md](./CODING_STANDARDS.md)**

### Ключевые принципы

1. **Clean Code & SOLID** — Single Responsibility, DI, DRY, KISS
2. **Promise.all** — для параллельных запросов
3. **Pagination** — всегда добавляй пагинацию
4. **Soft Delete** — используй статусы вместо удаления
5. **AuditLog** — логируй все изменения
6. **ConflictChecker** — проверяй конфликты времени

### Backend правила

```typescript
// ✅ Параллельные запросы
const [data, total] = await Promise.all([
  this.prisma.client.findMany({ skip, take }),
  this.prisma.client.count(),
]);

// ✅ Soft Delete
await this.prisma.client.update({
  where: { id },
  data: { status: ClientStatus.INACTIVE }
});

// ✅ AuditLog
await this.auditLog.log({
  userId,
  action: AuditAction.CREATE,
  entityType: 'Client',
  entityId: client.id,
});

// ✅ @Public() для открытых endpoints
@Public()
@Post('login')
login(@Body() dto: LoginDto) {}
```

### Frontend правила

```typescript
// ✅ React Query
const { data, isLoading } = useClients(filters);
const mutation = useCreateClient();

// ✅ shadcn/ui компоненты
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// ✅ Zustand
const { user } = useAuthStore();

// ✅ Tailwind
<div className="flex items-center gap-4 p-4">
```

---

## Важные файлы проекта

### Backend
| Файл | Описание |
|------|----------|
| `CODING_STANDARDS.md` | Стандарты кодирования |
| `backend/prisma/schema.prisma` | Схема БД (50+ моделей) |
| `backend/src/clients/` | Эталонный модуль |
| `backend/src/shared/conflict-checker.service.ts` | Эталон оптимизации |
| `backend/src/common/services/s3-storage.service.ts` | S3 хранилище |
| `backend/src/common/cache/reference-data.cache.ts` | In-memory кэш |
| `backend/src/common/events/data-events.service.ts` | SSE события |
| `backend/src/common/utils/optimistic-lock.util.ts` | Оптимистичная блокировка |
| `backend/src/integrations/` | Все интеграции |
| `backend/ecosystem.config.js` | PM2 конфигурация |

### Frontend
| Файл | Описание |
|------|----------|
| `frontend/app/(dashboard)/clients/` | Эталонная страница |
| `frontend/lib/api/client.ts` | API клиент с refresh token |
| `frontend/lib/store/auth-store.ts` | Auth store |
| `frontend/hooks/` | Все React Query hooks |
| `frontend/components/ui/` | shadcn/ui компоненты |

### Infrastructure
| Файл | Описание |
|------|----------|
| `docker-compose.prod.yml` | Production конфигурация |
| `deploy-unified.sh` | Скрипт деплоя |
| `nginx/` | Nginx конфигурация |

---

## Чек-лист перед завершением задачи

- [ ] Код следует CODING_STANDARDS.md
- [ ] TypeScript с полной типизацией
- [ ] Backend: валидация через DTO
- [ ] Backend: error handling (NestJS exceptions)
- [ ] Backend: оптимизированы запросы (Promise.all, select, pagination)
- [ ] Backend: AuditLog для изменений данных
- [ ] Frontend: React Query hooks
- [ ] Frontend: shadcn/ui компоненты
- [ ] Нет console.log в финальном коде
- [ ] Git commit следует Conventional Commits

---

## Что делать, если не уверен

1. **Проверь CODING_STANDARDS.md**
2. **Посмотри эталонный код:**
   - Backend: `src/clients/`
   - Frontend: `app/(dashboard)/clients/`
3. **Спроси у пользователя**

---

**Качество кода важнее скорости. Лучше написать правильно с первого раза.**
