# Модуль 8: Посещаемость (Attendance)

**Версия:** 1.0
**Дата создания:** 2025-11-17
**Статус:** 🟢 Реализован (Backend ✅, Frontend ✅)
**Связанные модули:** [Абонементы](./06_SUBSCRIPTIONS_MODULE.md), [Расписание](./02_SCHEDULE_MODULE.md), [Счета](./06_INVOICES_MODULE.md), [Клиенты](./01_CRM_MODULE.md)

---

## 📋 Обзор модуля

Модуль посещаемости обеспечивает учет посещений клиентов с автоматическим списанием абонементов, отслеживанием статусов списания услуг и ведением статистики.

### Основные возможности

- ✅ **Отметка посещаемости** (PRESENT, ABSENT, EXCUSED)
- ✅ **Автоматическое списание посещений** при отметке PRESENT
- ✅ **Валидация абонементов** (проверка активности, даты, остатка)
- ✅ **Обновление статуса списания** услуг (PENDING → IN_PROGRESS → COMPLETED)
- ✅ **Возврат посещений** при удалении или изменении статуса
- ✅ **Статистика посещаемости** клиента (общая, процент, детализация)
- ✅ **Интеграция с расписанием** (боковая панель в календаре)
- ✅ **Аудит посещаемости** (кто отметил, когда отметил)
- ✅ **Real-time обновления** через React Query

---

## 🗄️ Структура БД

### Модель: Attendance

```prisma
model Attendance {
  id                   String           @id @default(uuid())
  scheduleId           String           @map("schedule_id")
  clientId             String           @map("client_id")
  status               AttendanceStatus
  notes                String?
  subscriptionDeducted Boolean          @default(false) @map("subscription_deducted")
  createdAt            DateTime         @default(now()) @map("created_at")
  markedAt             DateTime?        @map("marked_at")
  markedBy             String?          @map("marked_by")
  subscriptionId       String?          @map("subscription_id")
  updatedAt            DateTime         @updatedAt @map("updated_at")

  client               Client           @relation(fields: [clientId], references: [id], onDelete: Cascade)
  markedByUser         User?            @relation(fields: [markedBy], references: [id], onDelete: SetNull)
  schedule             Schedule         @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  subscription         Subscription?    @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)

  @@unique([clientId, scheduleId])
  @@index([clientId])
  @@index([scheduleId])
  @@index([subscriptionId])
  @@index([markedBy])
  @@index([createdAt])
  @@map("attendances")
}

enum AttendanceStatus {
  PRESENT  // Присутствует
  ABSENT   // Отсутствует
  EXCUSED  // Уважительная причина
}
```

### Поля

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `scheduleId` | UUID | Ссылка на занятие (Schedule) |
| `clientId` | UUID | Ссылка на клиента (Client) |
| `status` | Enum | Статус посещения (PRESENT/ABSENT/EXCUSED) |
| `notes` | String? | Дополнительные заметки |
| `subscriptionDeducted` | Boolean | Флаг списания абонемента |
| `createdAt` | DateTime | Дата создания записи |
| `markedAt` | DateTime? | Дата и время отметки |
| `markedBy` | UUID? | Кто отметил посещение (User) |
| `subscriptionId` | UUID? | Связанный абонемент |
| `updatedAt` | DateTime | Дата последнего обновления |

### Связи

- **Client** (CASCADE): При удалении клиента удаляются все записи посещаемости
- **Schedule** (CASCADE): При удалении занятия удаляются все записи посещаемости
- **Subscription** (SET NULL): При удалении абонемента связь обнуляется, запись сохраняется
- **User** (SET NULL): При удалении пользователя аудит сохраняется, но ссылка обнуляется

### Индексы

```sql
CREATE INDEX idx_attendance_client_id ON attendances(client_id);
CREATE INDEX idx_attendance_schedule_id ON attendances(schedule_id);
CREATE INDEX idx_attendance_subscription_id ON attendances(subscription_id);
CREATE INDEX idx_attendance_marked_by ON attendances(marked_by);
CREATE INDEX idx_attendance_created_at ON attendances(created_at);
CREATE UNIQUE INDEX attendances_client_id_schedule_id_key ON attendances(client_id, schedule_id);
```

### Триггеры

```sql
CREATE TRIGGER update_attendances_updated_at
BEFORE UPDATE ON attendances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔌 Backend API

### Базовый URL
```
http://localhost:3000/api/attendance
```

### Endpoints

#### 1. Отметить посещение
```http
POST /attendance
Authorization: Bearer <token>
Content-Type: application/json

{
  "scheduleId": "uuid",
  "clientId": "uuid",
  "status": "PRESENT",
  "notes": "Опоздал на 10 минут"
}
```

**Бизнес-логика:**
1. Проверка существования Schedule и Group
2. Проверка дубликатов (уникальность clientId + scheduleId)
3. Если status = PRESENT:
   - Поиск валидного абонемента для client + group + date
   - Валидация абонемента (ACTIVE, в диапазоне дат, есть остаток)
   - Списание 1 посещения (для SINGLE_VISIT)
   - Обновление InvoiceItem.writeOffStatus:
     - PENDING → IN_PROGRESS (первое посещение)
     - IN_PROGRESS → COMPLETED (все посещения израсходованы)
4. Создание записи Attendance с метаданными (markedBy, markedAt)

**Response 201:**
```json
{
  "id": "uuid",
  "scheduleId": "uuid",
  "clientId": "uuid",
  "status": "PRESENT",
  "notes": "Опоздал на 10 минут",
  "subscriptionDeducted": true,
  "subscriptionId": "uuid",
  "markedBy": "user-uuid",
  "markedAt": "2025-11-17T10:30:00.000Z",
  "createdAt": "2025-11-17T10:30:00.000Z",
  "updatedAt": "2025-11-17T10:30:00.000Z",
  "client": {
    "id": "uuid",
    "firstName": "Иван",
    "lastName": "Петров"
  },
  "schedule": {
    "id": "uuid",
    "startTime": "2025-11-17T10:00:00.000Z",
    "endTime": "2025-11-17T11:00:00.000Z",
    "group": {
      "id": "uuid",
      "name": "Вокал - средняя группа"
    }
  },
  "subscription": {
    "id": "uuid",
    "remainingVisits": 7,
    "subscriptionType": {
      "name": "8 занятий"
    }
  },
  "markedByUser": {
    "id": "uuid",
    "firstName": "Администратор"
  }
}
```

#### 2. Получить список посещаемости
```http
GET /attendance?scheduleId=uuid&groupId=uuid&clientId=uuid&status=PRESENT&dateFrom=2025-11-01&dateTo=2025-11-30&page=1&limit=50
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": [/* Attendance[] */],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

#### 3. Получить посещаемость по занятию
```http
GET /attendance/by-schedule/:scheduleId
Authorization: Bearer <token>
```

**Использование:** Отображение в AttendanceSheet для конкретного занятия.

**Response 200:** `Attendance[]` (все записи для указанного scheduleId)

#### 4. Получить статистику клиента
```http
GET /attendance/stats/:clientId?dateFrom=2025-11-01&dateTo=2025-11-30
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "totalAttendances": 24,
  "presentCount": 20,
  "absentCount": 2,
  "excusedCount": 2,
  "attendanceRate": 83.33,
  "lastAttendance": {
    "id": "uuid",
    "scheduleId": "uuid",
    "status": "PRESENT",
    "markedAt": "2025-11-17T10:30:00.000Z",
    "schedule": {
      "group": {
        "name": "Вокал - средняя группа"
      }
    }
  }
}
```

#### 5. Получить запись по ID
```http
GET /attendance/:id
Authorization: Bearer <token>
```

#### 6. Обновить статус посещения
```http
PATCH /attendance/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "ABSENT",
  "notes": "Болел"
}
```

**Бизнес-логика при смене статуса:**

| Старый статус | Новый статус | Действие |
|---------------|--------------|----------|
| PRESENT | ABSENT/EXCUSED | Возврат посещения (+1 к remainingVisits), откат writeOffStatus |
| ABSENT/EXCUSED | PRESENT | Списание посещения (-1 от remainingVisits), обновление writeOffStatus |
| ABSENT | EXCUSED | Без изменений абонемента |

**Response 200:** Обновленная запись Attendance

#### 7. Удалить запись посещения
```http
DELETE /attendance/:id
Authorization: Bearer <token>
```

**Роль:** Только ADMIN

**Бизнес-логика:**
1. Если запись имела status = PRESENT:
   - Возврат посещения (+1 к remainingVisits)
   - Откат writeOffStatus (COMPLETED → IN_PROGRESS или IN_PROGRESS → PENDING)
2. Удаление записи из БД

**Response 200:**
```json
{
  "message": "Attendance record deleted successfully"
}
```

---

## 🧠 Бизнес-логика

### 1. Поиск валидного абонемента

**Метод:** `findValidSubscription(clientId, groupId, scheduleDate)`

**Алгоритм:**
```typescript
1. Найти абонемент WHERE:
   - clientId = clientId
   - groupId = groupId
   - status = 'ACTIVE'
   - scheduleDate >= startDate
   - scheduleDate <= endDate
   - (remainingVisits IS NULL OR remainingVisits > 0)

2. Если найдено несколько:
   - Приоритет: SINGLE_VISIT > UNLIMITED
   - Сортировка: endDate ASC (истекающие первыми)

3. Возврат первого подходящего абонемента
```

### 2. Списание посещения

**Метод:** `deductVisit(subscriptionId)`

**Условия:**
- Тип абонемента = SINGLE_VISIT
- `remainingVisits > 0`

**Действия:**
```typescript
1. subscription.remainingVisits -= 1
2. Обновить Subscription в БД
3. Обновить InvoiceItem.writeOffStatus
```

### 3. Обновление статуса списания услуги

**Метод:** `updateInvoiceItemStatus(subscriptionId)`

**Логика:**
```typescript
1. Найти InvoiceItem WHERE:
   - Invoice.subscriptionId = subscriptionId
   - serviceType = 'SUBSCRIPTION'

2. Определить текущее состояние:
   - Если remainingVisits === null (UNLIMITED):
     - writeOffStatus = IN_PROGRESS (после первого посещения)
   - Если remainingVisits > 0:
     - writeOffStatus = IN_PROGRESS
   - Если remainingVisits === 0:
     - writeOffStatus = COMPLETED

3. Обновить InvoiceItem.writeOffStatus
```

### 4. Возврат посещения

**Метод:** `refundVisit(attendanceId)`

**Условия:**
- Запись имеет subscriptionDeducted = true
- Связан с абонементом (subscriptionId !== null)

**Действия:**
```typescript
1. subscription.remainingVisits += 1
2. Обновить Subscription в БД
3. Откатить InvoiceItem.writeOffStatus:
   - COMPLETED → IN_PROGRESS (если remainingVisits > 0)
   - IN_PROGRESS → PENDING (если это была первая отметка)
```

---

## 📁 Структура файлов

### Backend

```
backend/src/attendance/
├── dto/
│   ├── create-attendance.dto.ts          (18 строк)
│   ├── update-attendance.dto.ts          (13 строк)
│   └── attendance-filter.dto.ts          (42 строк)
├── attendance.service.ts                 (596 строк)
├── attendance.controller.ts              (71 строк)
└── attendance.module.ts                  (12 строк)
```

**Файлы:**
- **attendance.service.ts** - Основная бизнес-логика
  - `mark()` - отметить посещение с валидацией и списанием
  - `findAll()` - получить список с фильтрацией и пагинацией
  - `findBySchedule()` - все посещения для занятия
  - `getClientStats()` - статистика клиента
  - `findOne()` - одна запись по ID
  - `update()` - обновление статуса с возвратом/списанием
  - `remove()` - удаление с откатом абонемента
  - `findValidSubscription()` - поиск валидного абонемента
  - `updateInvoiceItemStatus()` - обновление writeOffStatus
  - `revertInvoiceItemStatus()` - откат writeOffStatus

- **attendance.controller.ts** - REST API endpoints
  - `POST /attendance` - mark()
  - `GET /attendance` - findAll()
  - `GET /attendance/by-schedule/:scheduleId` - findBySchedule()
  - `GET /attendance/stats/:clientId` - getClientStats()
  - `GET /attendance/:id` - findOne()
  - `PATCH /attendance/:id` - update()
  - `DELETE /attendance/:id` - remove() (ADMIN only)

### Frontend

```
frontend/
├── app/(dashboard)/schedule/
│   └── attendance-sheet.tsx              (285 строк)
│
├── hooks/
│   └── use-attendance.ts                 (140 строк)
│
├── lib/
│   ├── api/
│   │   └── attendance.ts                 (101 строк)
│   └── types/
│       └── attendance.ts                 (113 строк)
```

**Файлы:**
- **attendance-sheet.tsx** - Компонент боковой панели для отметки посещаемости
  - Статистика посещаемости (present, absent, excused, not marked)
  - Список клиентов группы с абонементами
  - Кнопки отметки (Present/Absent/Excused)
  - Индикаторы валидности абонементов
  - Отображение остатка посещений

- **use-attendance.ts** - React Query hooks
  - `useAttendances()` - получить список с фильтрацией
  - `useAttendanceBySchedule()` - список для занятия
  - `useAttendanceStats()` - статистика клиента
  - `useAttendance()` - одна запись
  - `useMarkAttendance()` - создать запись
  - `useUpdateAttendance()` - обновить статус
  - `useDeleteAttendance()` - удалить (ADMIN)

- **attendance.ts (API)** - HTTP клиент
  - `attendanceApi.mark()` - POST /attendance
  - `attendanceApi.getAll()` - GET /attendance
  - `attendanceApi.getBySchedule()` - GET /attendance/by-schedule/:id
  - `attendanceApi.getClientStats()` - GET /attendance/stats/:id
  - `attendanceApi.getById()` - GET /attendance/:id
  - `attendanceApi.update()` - PATCH /attendance/:id
  - `attendanceApi.delete()` - DELETE /attendance/:id

- **attendance.ts (Types)** - TypeScript интерфейсы
  - `Attendance` - основная модель
  - `AttendanceStatus` - enum
  - `AttendanceStats` - статистика
  - `CreateAttendanceDto` - DTO создания
  - `UpdateAttendanceDto` - DTO обновления
  - `AttendanceFilterDto` - DTO фильтрации
  - `PaginatedAttendanceResponse` - пагинированный ответ
  - `ClientWithSubscription` - клиент с абонементом

---

## 🎨 Frontend компоненты

### AttendanceSheet Component

**Расположение:** `frontend/app/(dashboard)/schedule/attendance-sheet.tsx`

**Пропсы:**
```typescript
interface AttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  groupId: string;
  groupName: string;
  scheduleDate: Date;
}
```

**Функциональность:**
1. **Статистика в шапке:**
   - Всего клиентов
   - Присутствуют (зелёный)
   - Отсутствуют (красный)
   - Уважительная причина (жёлтый)
   - Не отмечены (серый)

2. **Список клиентов:**
   - Имя клиента
   - Статус абонемента (иконка: ✅ валиден, ❌ невалиден)
   - Остаток посещений (для SINGLE_VISIT)
   - Предупреждение об истечении (< 3 посещений)
   - Кнопки отметки: Present / Absent / Excused
   - Текущий статус (если уже отмечен)

3. **Интеграция данных:**
   - Загрузка абонементов для группы (`useSubscriptions`)
   - Загрузка посещаемости для занятия (`useAttendanceBySchedule`)
   - Объединение данных по clientId

4. **Обработка действий:**
   - Отметка посещения (создание или обновление)
   - Оптимистичные обновления (React Query invalidation)
   - Toast уведомления об успехе/ошибке

**Пример UI:**
```
┌─────────────────────────────────────────────────┐
│ Посещаемость: Вокал - средняя группа            │
│ 17.11.2025 10:00 - 11:00                       │
├─────────────────────────────────────────────────┤
│ Статистика                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │  12  │ │  8   │ │  2   │ │  2   │           │
│ │Всего │ │✅    │ │❌    │ │⚠️    │           │
│ └──────┘ └──────┘ └──────┘ └──────┘           │
├─────────────────────────────────────────────────┤
│ Клиенты                                         │
│                                                 │
│ Иван Петров                    ✅ 7 посещений  │
│ [Present] [Absent] [Excused]                   │
│                                                 │
│ Мария Сидорова                 ✅ Безлимит     │
│ ✓ PRESENT                                       │
│                                                 │
│ Алексей Иванов                 ❌ Истёк        │
│ Абонемент недействителен                        │
│                                                 │
│ Елена Смирнова                 ⚠️ 2 посещения  │
│ [Present] [Absent] [Excused]   ⚠️ Скоро истечёт│
└─────────────────────────────────────────────────┘
```

---

## 🔗 Интеграции с другими модулями

### 1. Интеграция с модулем Расписания

**Файл:** `frontend/app/(dashboard)/schedule/page.tsx`

**Реализация:**
```typescript
// Импорт компонента
import { AttendanceSheet } from './attendance-sheet';

// Состояние
const [attendanceSheetOpen, setAttendanceSheetOpen] = useState(false);
const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

// Открытие панели
const handleMarkAttendance = (schedule: Schedule) => {
  setSelectedSchedule(schedule);
  setAttendanceSheetOpen(true);
};

// Рендеринг
<AttendanceSheet
  open={attendanceSheetOpen}
  onOpenChange={setAttendanceSheetOpen}
  scheduleId={selectedSchedule?.id || ''}
  groupId={selectedSchedule?.groupId || ''}
  groupName={selectedSchedule?.group?.name || ''}
  scheduleDate={new Date(selectedSchedule?.startTime || '')}
/>
```

**Точка входа:**
- Кнопка "Отметить посещаемость" в CalendarEventDialog
- Открывает AttendanceSheet справа от экрана (Sheet component)

### 2. Интеграция с модулем Абонементов

**Backend:**
```typescript
// attendance.service.ts

async findValidSubscription(clientId: string, groupId: string, date: Date) {
  return this.prisma.subscription.findFirst({
    where: {
      clientId,
      groupId,
      status: 'ACTIVE',
      startDate: { lte: date },
      endDate: { gte: date },
      OR: [
        { remainingVisits: { gt: 0 } },
        { remainingVisits: null } // UNLIMITED
      ]
    },
    include: { subscriptionType: true },
    orderBy: [
      { subscriptionType: { type: 'asc' } }, // SINGLE_VISIT first
      { endDate: 'asc' } // Expiring first
    ]
  });
}

async deductVisit(subscription: Subscription) {
  if (subscription.subscriptionType.type === 'SINGLE_VISIT') {
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { remainingVisits: { decrement: 1 } }
    });
  }
}
```

**Frontend:**
```typescript
// attendance-sheet.tsx

// Загрузка абонементов
const { data: subscriptions } = useSubscriptions({
  groupId: groupId,
  status: 'ACTIVE'
});

// Валидация абонемента
const isSubscriptionValid = (clientId: string) => {
  const subscription = subscriptions?.data.find(s => s.clientId === clientId);
  if (!subscription) return false;

  const isActive = subscription.status === 'ACTIVE';
  const isInDateRange =
    new Date(subscription.startDate) <= scheduleDate &&
    new Date(subscription.endDate) >= scheduleDate;
  const hasVisits =
    subscription.remainingVisits === null ||
    subscription.remainingVisits > 0;

  return isActive && isInDateRange && hasVisits;
};
```

### 3. Интеграция с модулем Счетов

**Обновление writeOffStatus:**
```typescript
// attendance.service.ts

async updateInvoiceItemStatus(subscriptionId: string) {
  // 1. Найти InvoiceItem
  const invoiceItem = await this.prisma.invoiceItem.findFirst({
    where: {
      invoice: { subscriptionId },
      serviceType: 'SUBSCRIPTION'
    },
    include: { invoice: { include: { subscription: true } } }
  });

  if (!invoiceItem) return;

  const subscription = invoiceItem.invoice.subscription;

  // 2. Определить новый статус
  let newStatus: WriteOffStatus;

  if (subscription.remainingVisits === null) {
    // UNLIMITED - всегда IN_PROGRESS после первой отметки
    newStatus = 'IN_PROGRESS';
  } else if (subscription.remainingVisits === 0) {
    // Все посещения израсходованы
    newStatus = 'COMPLETED';
  } else {
    // Ещё есть посещения
    newStatus = 'IN_PROGRESS';
  }

  // 3. Обновить статус
  await this.prisma.invoiceItem.update({
    where: { id: invoiceItem.id },
    data: { writeOffStatus: newStatus }
  });
}
```

### 4. Интеграция с модулем Клиентов

**ClientHistoryCard - вкладка "Посещаемость":**
```typescript
// client-history-card.tsx (строки 256-270)

<TabsContent value="attendance">
  <div className="text-sm text-muted-foreground">
    История посещаемости (TODO: реализовать отображение)
  </div>
</TabsContent>
```

**Планируется:**
- Список всех посещений клиента
- Фильтрация по группам и датам
- Статистика посещаемости
- Прогресс использования абонементов

---

## 🧪 Примеры использования

### 1. Отметка посещения

**Backend API:**
```typescript
import { attendanceApi } from '@/lib/api/attendance';

const attendance = await attendanceApi.mark({
  scheduleId: 'schedule-uuid',
  clientId: 'client-uuid',
  status: 'PRESENT'
});

console.log(`Посещение отмечено: ${attendance.status}`);
console.log(`Списан абонемент: ${attendance.subscriptionDeducted}`);
console.log(`Осталось посещений: ${attendance.subscription?.remainingVisits}`);
```

**React Hook:**
```typescript
import { useMarkAttendance } from '@/hooks/use-attendance';

const markAttendance = useMarkAttendance();

const handleMarkPresent = async () => {
  try {
    await markAttendance.mutateAsync({
      scheduleId,
      clientId,
      status: 'PRESENT'
    });
    toast.success('Посещение отмечено!');
  } catch (error) {
    toast.error('Ошибка при отметке посещения');
  }
};
```

### 2. Получение посещаемости для занятия

```typescript
import { useAttendanceBySchedule } from '@/hooks/use-attendance';

const AttendanceList = ({ scheduleId }: { scheduleId: string }) => {
  const { data: attendances, isLoading } = useAttendanceBySchedule(scheduleId);

  if (isLoading) return <div>Загрузка...</div>;

  return (
    <ul>
      {attendances?.map(attendance => (
        <li key={attendance.id}>
          {attendance.client.firstName} {attendance.client.lastName} - {attendance.status}
        </li>
      ))}
    </ul>
  );
};
```

### 3. Статистика клиента

```typescript
import { useAttendanceStats } from '@/hooks/use-attendance';

const ClientStats = ({ clientId }: { clientId: string }) => {
  const { data: stats } = useAttendanceStats(
    clientId,
    '2025-11-01',
    '2025-11-30'
  );

  return (
    <div>
      <h3>Статистика за ноябрь 2025</h3>
      <p>Всего посещений: {stats?.totalAttendances}</p>
      <p>Присутствовал: {stats?.presentCount}</p>
      <p>Процент посещаемости: {stats?.attendanceRate}%</p>
    </div>
  );
};
```

### 4. Обновление статуса

```typescript
import { useUpdateAttendance } from '@/hooks/use-attendance';

const updateAttendance = useUpdateAttendance();

const handleChangeStatus = async (attendanceId: string) => {
  await updateAttendance.mutateAsync({
    id: attendanceId,
    data: {
      status: 'EXCUSED',
      notes: 'Медицинская справка'
    }
  });
};
```

---

## 📊 Статистика реализации

### Завершено ✅

**Backend:**
- [x] Prisma Schema (Attendance модель, enum AttendanceStatus)
- [x] Attendance модуль (Service, Controller, DTOs)
- [x] 7 API endpoints (POST, GET, GET/:id, PATCH, DELETE, by-schedule, stats)
- [x] Бизнес-логика списания абонементов
- [x] Валидация абонементов
- [x] Обновление InvoiceItem.writeOffStatus
- [x] Возврат посещений при удалении/изменении
- [x] Аудит посещаемости (markedBy, markedAt)

**Database:**
- [x] Миграции БД (добавление subscriptionId, markedBy, markedAt, updatedAt)
- [x] Индексы для оптимизации запросов
- [x] Триггеры auto-update для updated_at
- [x] Foreign key constraints

**Frontend:**
- [x] TypeScript типы (Attendance, DTOs, Stats)
- [x] API client (attendanceApi с 7 методами)
- [x] React Query hooks (7 хуков)
- [x] AttendanceSheet компонент (285 строк)
- [x] Интеграция в Schedule (боковая панель)
- [x] Статистика посещаемости в реальном времени
- [x] Оптимистичные обновления

**Интеграции:**
- [x] Модуль Расписания (кнопка в CalendarEventDialog)
- [x] Модуль Абонементов (списание remainingVisits)
- [x] Модуль Счетов (обновление writeOffStatus)
- [x] Модуль Клиентов (заглушка вкладки "Посещаемость")

### Отложено на будущее 🔴

- [ ] Отображение истории посещаемости в ClientHistoryCard
- [ ] Аналитика посещаемости (графики, тренды)
- [ ] Экспорт данных посещаемости (Excel, PDF)
- [ ] Уведомления о низкой посещаемости
- [ ] Автоматическая компенсация по болезни
- [ ] Массовая отметка посещаемости (несколько клиентов одновременно)

---

## 🔧 Миграции БД

### Миграционные скрипты

**Файл:** `backend/attendance_migration.sql` (52 строки)

**Содержание:**
```sql
-- 1. Добавление новых полей
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS subscription_id UUID,
ADD COLUMN IF NOT EXISTS marked_by UUID,
ADD COLUMN IF NOT EXISTS marked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Создание foreign key constraints
ALTER TABLE attendances
ADD CONSTRAINT fk_attendance_subscription
  FOREIGN KEY (subscription_id)
  REFERENCES subscriptions(id)
  ON DELETE SET NULL;

ALTER TABLE attendances
ADD CONSTRAINT fk_attendance_marked_by
  FOREIGN KEY (marked_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- 3. Создание индексов
CREATE INDEX IF NOT EXISTS idx_attendance_subscription_id
  ON attendances(subscription_id);

CREATE INDEX IF NOT EXISTS idx_attendance_marked_by
  ON attendances(marked_by);

CREATE INDEX IF NOT EXISTS idx_attendance_created_at
  ON attendances(created_at);

-- 4. Создание триггера для auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendances_updated_at
BEFORE UPDATE ON attendances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Выполнение:**
```bash
# Через Node.js скрипт
node backend/run-attendance-migration-fixed.js

# Или напрямую через Prisma
npx prisma db push
```

---

## 🔗 Связанные документы

- [ROADMAP.md](../ROADMAP.md) - Week 8: Посещаемость и Платежи
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - Полная схема БД
- [Модуль 6: Абонементы](./06_SUBSCRIPTIONS_MODULE.md) - Интеграция с абонементами
- [Модуль 2: Расписание](./02_SCHEDULE_MODULE.md) - Интеграция с расписанием
- [Модуль 6: Счета](./06_INVOICES_MODULE.md) - Обновление writeOffStatus
- [Модуль 1: CRM](./01_CRM_MODULE.md) - История посещаемости клиента

---

## 📈 Производительность

### Оптимизация запросов

1. **Индексы:**
   - `client_id` - быстрый поиск по клиенту
   - `schedule_id` - быстрый поиск по занятию
   - `subscription_id` - быстрая связь с абонементами
   - `marked_by` - аудит по пользователю
   - `created_at` - сортировка по дате

2. **Eager loading:**
   ```typescript
   include: {
     client: true,
     schedule: { include: { group: true } },
     subscription: { include: { subscriptionType: true } },
     markedByUser: true
   }
   ```

3. **Пагинация:**
   - По умолчанию: page=1, limit=50
   - Максимум: limit=100

4. **React Query кэширование:**
   - `staleTime: 30s` - данные актуальны 30 секунд
   - Инвалидация при создании/обновлении
   - Оптимистичные обновления для UX

---

**Дата последнего обновления:** 2025-11-17
**Версия документа:** 1.0
**Статус:** ✅ Полностью реализован и задокументирован
