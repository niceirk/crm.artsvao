# Модуль 6: Абонементы (Subscriptions)

**Версия:** 1.0
**Дата создания:** 2025-11-16
**Статус:** 🟡 Backend завершен (65%), Frontend в разработке
**Связанные модули:** [Счета](./05_INVOICES_MODULE.md), [Клиенты](./01_CLIENTS_CRM_MODULE.md), [Группы](./03_SCHEDULE_MODULE.md)

---

## 📋 Обзор модуля

Модуль абонементов обеспечивает продажу и управление абонементами для занятий в группах с автоматическим расчетом цены, применением льгот и созданием счетов.

### Основные возможности

- ✅ **Типы абонементов** (UNLIMITED, SINGLE_VISIT)
- ✅ **Пропорциональная цена** при покупке середины месяца
- ✅ **Автоматическое применение льготных категорий**
- ✅ **Валидация минимального порога** (≥3 занятия до конца месяца)
- ✅ **Мультимесячные покупки**
- ✅ **Автоматическое создание Invoice** при продаже
- 🔜 Управление абонементами (UI)
- 🔜 История использования абонементов

---

## 🗄️ Структура БД

### Модель: SubscriptionType

```prisma
model SubscriptionType {
  id            String               @id @default(uuid())
  name          String
  description   String?
  groupId       String               @map("group_id")
  type          SubscriptionTypeEnum
  price         Decimal              @db.Decimal(10, 2)
  isActive      Boolean              @default(true) @map("is_active")
  createdAt     DateTime             @default(now()) @map("created_at")
  updatedAt     DateTime             @updatedAt @map("updated_at")

  group         Group                @relation(fields: [groupId], references: [id])
  subscriptions Subscription[]

  @@index([groupId, isActive])
  @@map("subscription_types")
}

enum SubscriptionTypeEnum {
  UNLIMITED    // Безлимитный (все занятия месяца)
  SINGLE_VISIT // Разовые посещения (фиксированное кол-во)
}
```

### Модель: Subscription

```prisma
model Subscription {
  id                 String             @id @default(uuid())
  clientId           String             @map("client_id")
  subscriptionTypeId String             @map("subscription_type_id")
  groupId            String             @map("group_id")
  validMonth         String             @map("valid_month") // YYYY-MM
  purchaseDate       DateTime           @map("purchase_date")
  startDate          DateTime           @map("start_date")
  endDate            DateTime           @map("end_date")
  originalPrice      Decimal            @map("original_price") @db.Decimal(10, 2)
  discountAmount     Decimal            @default(0) @map("discount_amount") @db.Decimal(10, 2)
  paidPrice          Decimal            @map("paid_price") @db.Decimal(10, 2)
  remainingVisits    Int?               @map("remaining_visits")
  purchasedMonths    Int                @default(1) @map("purchased_months")
  status             SubscriptionStatus
  compensationAmount Decimal?           @map("compensation_amount") @db.Decimal(10, 2)
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  client             Client             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  group              Group              @relation(fields: [groupId], references: [id])
  subscriptionType   SubscriptionType   @relation(fields: [subscriptionTypeId], references: [id])
  payments           Payment[]
  invoices           Invoice[]          // Связь с Invoice

  @@index([clientId, status])
  @@index([groupId, validMonth])
  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE    // Активный
  EXPIRED   // Истекший
  FROZEN    // Замороженный
  CANCELLED // Отмененный
}
```

---

## 🔌 Backend API

### Базовый URL
```
http://localhost:3000/api
```

### SubscriptionTypes Endpoints

#### 1. Создать тип абонемента
```http
POST /subscription-types
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Безлимитный абонемент",
  "description": "Неограниченное посещение занятий группы в течение месяца",
  "groupId": "uuid",
  "type": "UNLIMITED",
  "price": 5000,
  "isActive": true
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "name": "Безлимитный абонемент",
  "description": "Неограниченное посещение занятий группы в течение месяца",
  "groupId": "uuid",
  "type": "UNLIMITED",
  "price": "5000.00",
  "isActive": true,
  "createdAt": "2025-11-16T12:00:00.000Z",
  "updatedAt": "2025-11-16T12:00:00.000Z",
  "group": {
    "id": "uuid",
    "name": "Вокал - средняя группа",
    "studio": {
      "id": "uuid",
      "name": "Вокальная студия"
    }
  },
  "_count": {
    "subscriptions": 0
  }
}
```

#### 2. Получить список типов абонементов
```http
GET /subscription-types?groupId=uuid&isActive=true&page=1&limit=50
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": [/* SubscriptionType[] */],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1
  }
}
```

#### 3. Получить типы абонементов по группе
```http
GET /subscription-types/by-group/:groupId
Authorization: Bearer <token>
```

**Response 200:** `SubscriptionType[]` (только активные)

#### 4. Получить тип абонемента по ID
```http
GET /subscription-types/:id
Authorization: Bearer <token>
```

#### 5. Обновить тип абонемента
```http
PATCH /subscription-types/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 5500,
  "isActive": false
}
```

#### 6. Удалить тип абонемента
```http
DELETE /subscription-types/:id
Authorization: Bearer <token>
```

**Защита:** Нельзя удалить тип, если к нему привязаны активные абонементы.

---

### Subscriptions Endpoints

#### 1. Продать абонемент
```http
POST /subscriptions/sell
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": "uuid",
  "subscriptionTypeId": "uuid",
  "groupId": "uuid",
  "validMonth": "2025-12",
  "purchasedMonths": 1,
  "notes": "Заметка"
}
```

**Бизнес-логика:**
1. Получение типа абонемента и клиента
2. Расчет дат (startDate = дата покупки, endDate = последний день validMonth)
3. **Пропорциональный расчет цены:**
   ```typescript
   const daysInMonth = endDate.getDate();
   const remainingDays = Math.ceil((endDate - purchaseDate) / (1000*60*60*24)) + 1;

   let proportionalPrice = basePrice;
   if (remainingDays < daysInMonth) {
     proportionalPrice = (basePrice / daysInMonth) * remainingDays;
   }

   const totalPrice = proportionalPrice + basePrice * (purchasedMonths - 1);
   ```
4. **Применение льготной категории:**
   ```typescript
   if (benefitCategory?.isActive) {
     discountAmount = (totalPrice * benefitCategory.discountPercent) / 100;
   }
   finalPrice = totalPrice - discountAmount;
   ```
5. **Валидация минимального порога** (только для первого месяца):
   - Проверяет количество запланированных занятий (status = PLANNED)
   - Если `schedules < 3`, выбрасывает ошибку
6. Создание Subscription с status = ACTIVE
7. **Автоматическое создание Invoice** с InvoiceItem:
   ```typescript
   serviceType: ServiceType.SUBSCRIPTION
   serviceName: `Абонемент "${type.name}" - ${group.name}`
   quantity: purchasedMonths
   basePrice: subscriptionType.price
   unitPrice: finalPrice / purchasedMonths
   vatRate: 0  // Абонементы без НДС
   writeOffTiming: WriteOffTiming.ON_USE
   ```

**Response 201:**
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "subscriptionTypeId": "uuid",
  "groupId": "uuid",
  "validMonth": "2025-12",
  "purchaseDate": "2025-11-16T12:00:00.000Z",
  "startDate": "2025-11-16T12:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z",
  "originalPrice": "5000.00",
  "discountAmount": "500.00",
  "paidPrice": "4500.00",
  "remainingVisits": null,
  "purchasedMonths": 1,
  "status": "ACTIVE",
  "client": { /* Client details */ },
  "group": { /* Group details */ },
  "subscriptionType": { /* SubscriptionType details */ }
}
```

#### 2. Получить список абонементов
```http
GET /subscriptions?clientId=uuid&groupId=uuid&status=ACTIVE&validMonth=2025-12&page=1&limit=50
Authorization: Bearer <token>
```

#### 3. Получить абонемент по ID
```http
GET /subscriptions/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": "uuid",
  /* ... все поля ... */
  "client": { /* С benefitCategory */ },
  "group": { /* С teacher и studio */ },
  "subscriptionType": { /* Детали типа */ },
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-00001",
      "status": "PAID",
      "totalAmount": "4500.00",
      "issuedAt": "2025-11-16T12:00:00.000Z"
    }
  ]
}
```

#### 4. Обновить абонемент
```http
PATCH /subscriptions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "FROZEN",
  "remainingVisits": 5
}
```

**Ограничения:** Можно обновить только `status` и `remainingVisits`.

#### 5. Валидировать абонемент на дату
```http
POST /subscriptions/:id/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2025-12-15"  // Optional, default = today
}
```

**Логика валидации:**
```typescript
const isValid =
  subscription.status === 'ACTIVE' &&
  date >= subscription.startDate &&
  date <= subscription.endDate &&
  (subscription.remainingVisits === null || subscription.remainingVisits > 0);
```

**Response 200:**
```json
{
  "isValid": true,
  "subscription": { /* Subscription details */ },
  "message": "Subscription is valid"
}
```

---

## 📁 Структура файлов

### Backend
```
backend/src/
├── subscription-types/
│   ├── dto/
│   │   ├── create-subscription-type.dto.ts
│   │   ├── update-subscription-type.dto.ts
│   │   └── subscription-type-filter.dto.ts
│   ├── subscription-types.service.ts
│   ├── subscription-types.controller.ts
│   └── subscription-types.module.ts
│
├── subscriptions/
│   ├── dto/
│   │   ├── sell-subscription.dto.ts
│   │   ├── update-subscription.dto.ts
│   │   └── subscription-filter.dto.ts
│   ├── subscriptions.service.ts      # Основная бизнес-логика
│   ├── subscriptions.controller.ts
│   └── subscriptions.module.ts
│
└── app.module.ts  # Импорт SubscriptionTypes + Subscriptions
```

### Frontend (TypeScript/API)
```
frontend/
├── lib/
│   ├── types/
│   │   └── subscriptions.ts          # ✅ TypeScript интерфейсы
│   └── api/
│       └── subscriptions.ts          # ✅ API клиент (subscriptionTypesApi, subscriptionsApi)
│
├── hooks/
│   ├── use-subscription-types.ts     # 🔜 React Query hooks
│   └── use-subscriptions.ts          # 🔜 React Query hooks
│
├── components/
│   ├── subscriptions/
│   │   ├── SubscriptionsTable.tsx            # 🔜 Таблица абонементов
│   │   ├── SubscriptionFilters.tsx           # 🔜 Фильтры
│   │   ├── SellSubscriptionDialog.tsx        # 🔜 Диалог продажи
│   │   ├── SubscriptionDetailsSheet.tsx      # 🔜 Детали абонемента
│   │   └── SubscriptionStatusBadge.tsx       # 🔜 Badge статуса
│   └── subscription-types/
│       ├── SubscriptionTypesTable.tsx        # 🔜 Таблица типов
│       └── SubscriptionTypeDialog.tsx        # 🔜 Диалог создания/редактирования
│
└── app/(dashboard)/
    ├── subscriptions/
    │   └── page.tsx                  # 🔜 Страница списка абонементов
    └── admin/
        └── subscription-types/
            └── page.tsx              # 🔜 Страница управления типами
```

---

## 🧪 Примеры использования

### Создание типа абонемента
```typescript
import { subscriptionTypesApi } from '@/lib/api/subscriptions';

const newType = await subscriptionTypesApi.create({
  name: 'Безлимитный абонемент',
  description: 'Неограниченное посещение',
  groupId: groupId,
  type: 'UNLIMITED',
  price: 5000,
  isActive: true
});
```

### Продажа абонемента
```typescript
import { subscriptionsApi } from '@/lib/api/subscriptions';

const subscription = await subscriptionsApi.sell({
  clientId: 'client-uuid',
  subscriptionTypeId: 'type-uuid',
  groupId: 'group-uuid',
  validMonth: '2025-12',
  purchasedMonths: 3,
  notes: 'Клиент оплатил 3 месяца вперед'
});

console.log(`Создан абонемент ${subscription.id}`);
console.log(`Цена: ${subscription.paidPrice} (скидка: ${subscription.discountAmount})`);
```

### Получение абонементов клиента
```typescript
const result = await subscriptionsApi.getAll({
  clientId: 'client-uuid',
  status: 'ACTIVE',
  page: 1,
  limit: 10
});

console.log(`Активных абонементов: ${result.meta.total}`);
```

### Валидация абонемента
```typescript
const validation = await subscriptionsApi.validate(
  'subscription-uuid',
  '2025-12-15'
);

if (validation.isValid) {
  console.log('Абонемент действителен');
} else {
  console.log(`Абонемент недействителен: ${validation.message}`);
}
```

---

## 📊 Статистика реализации

### Завершено ✅
- [x] Prisma Schema (Subscription, SubscriptionType)
- [x] Backend SubscriptionTypes модуль (CRUD)
- [x] Backend Subscriptions модуль (продажа, управление)
- [x] Бизнес-логика (пропорциональная цена, льготы, валидация)
- [x] Автоматическое создание Invoice
- [x] Frontend TypeScript типы
- [x] Frontend API клиент
- [x] API endpoints тестирование

### В разработке 🟡
- [ ] React Query hooks
- [ ] Страница управления типами абонементов
- [ ] Страница продажи и списка абонементов
- [ ] Интеграция в CRM (вкладка абонементы клиента)

### Отложено на Фазу 2 🔴
- [ ] Автоматическая заморозка истекших (cron job)
- [ ] Отмена абонемента с пропорциональным возвратом
- [ ] Компенсации по болезни
- [ ] История использования абонементов
- [ ] Аналитика продаж абонементов

---

## 🔗 Интеграция с модулем Посещаемости

### Автоматическое списание посещений

Модуль посещаемости тесно интегрирован с абонементами для автоматического учета использования:

**При отметке PRESENT:**
1. Система находит валидный абонемент клиента для группы и даты
2. Для типа SINGLE_VISIT: декрементирует `remainingVisits` (-1)
3. Для типа UNLIMITED: проверяет только валидность дат
4. Обновляет InvoiceItem.writeOffStatus:
   - PENDING → IN_PROGRESS (первое посещение)
   - IN_PROGRESS → COMPLETED (все посещения израсходованы)

**При удалении/изменении статуса:**
- Возврат посещения (+1 к remainingVisits)
- Откат writeOffStatus обратно

**Пример из Attendance API:**
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
    orderBy: [
      { subscriptionType: { type: 'asc' } }, // SINGLE_VISIT приоритет
      { endDate: 'asc' } // Истекающие первыми
    ]
  });
}
```

### Отображение в UI

**AttendanceSheet (календарь расписания):**
- Показывает иконку валидности абонемента (✅/❌)
- Отображает остаток посещений для SINGLE_VISIT
- Предупреждает, если осталось < 3 посещений
- Блокирует отметку PRESENT, если абонемент недействителен

---

## 🔗 Связанные документы

- [ROADMAP.md](../ROADMAP.md) - Week 7: Абонементы
- [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - Полная схема БД
- [Модуль 5: Счета](./06_INVOICES_MODULE.md) - Интеграция с Invoice
- [Модуль 8: Посещаемость](./08_ATTENDANCE_MODULE.md) - Автоматическое списание посещений ⭐
- [Модуль 1: CRM](./01_CRM_MODULE.md) - Льготные категории клиентов
- [Модуль 3: Расписание](./02_SCHEDULE_MODULE.md) - Группы и занятия

---

**Статус:** ✅ Полностью реализован (Backend + Frontend + Интеграции)
