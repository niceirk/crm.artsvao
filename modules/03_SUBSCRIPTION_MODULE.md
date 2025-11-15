# Модуль 3: Абонементы и продажи

## Содержание

1. [Обзор модуля](#1-обзор-модуля)
2. [Типы абонементов](#2-типы-абонементов)
3. [Календарные абонементы](#3-календарные-абонементы)
4. [Привязка к группе](#4-привязка-к-группе)
5. [Пропорциональное ценообразование](#5-пропорциональное-ценообразование)
6. [Мультимесячные покупки](#6-мультимесячные-покупки)
7. [Компенсации по болезни](#7-компенсации-по-болезни)
8. [Льготные категории](#8-льготные-категории)
9. [UI/UX спецификация](#9-uiux-спецификация)
10. [API Endpoints](#10-api-endpoints)
11. [Бизнес-логика и валидация](#11-бизнес-логика-и-валидация)
12. [Примеры использования](#12-примеры-использования)

---

## 1. Обзор модуля

Модуль абонементов обеспечивает продажу и управление абонементами для посещения занятий в культурном центре.

### Ключевые особенности

1. **Календарные абонементы** - абонементы действуют на конкретный календарный месяц (например, ноябрь 2025), а не на 30 дней с момента покупки
2. **Привязка к группе** - каждый абонемент привязан к конкретной группе (например, "Йога - Начинающие")
3. **Пропорциональное ценообразование** - при покупке в середине месяца цена рассчитывается пропорционально оставшимся дням
4. **Компенсации по болезни** - автоматический расчет компенсации за пропущенные занятия при предоставлении медицинской справки
5. **Мультимесячные покупки** - возможность купить абонемент сразу на несколько месяцев вперед

### Связанные модули

- **CRM Module** - управление клиентами, которые покупают абонементы
- **Schedule Module** - расписание занятий, на которые записываются клиенты с абонементами
- **Payment Module** - оплата абонементов

---

## 2. Типы абонементов

### 2.1. Безлимитный абонемент (UNLIMITED)

**Описание:** Клиент может посещать все занятия группы в течение календарного месяца без ограничений по количеству посещений.

**Характеристики:**
- Действует на один календарный месяц (с 1-го по последнее число)
- Привязан к конкретной группе
- Не имеет ограничения по количеству посещений
- Поле `remainingVisits` = `null`

**Пример:**
```
Абонемент: "Йога - Начинающие (безлимит)"
Месяц: Ноябрь 2025
Цена: 5000 руб.
Количество занятий в месяц: 12
Клиент может посетить все 12 занятий
```

### 2.2. Разовые посещения (SINGLE_VISIT)

**Описание:** Клиент покупает определенное количество посещений на месяц.

**Характеристики:**
- Действует на один календарный месяц
- Привязан к конкретной группе
- Имеет фиксированное количество посещений
- Поле `remainingVisits` отслеживает остаток

**Пример:**
```
Абонемент: "Йога - Начинающие (4 занятия)"
Месяц: Ноябрь 2025
Цена за 1 занятие: 500 руб.
Количество посещений: 4
Итого: 2000 руб.
remainingVisits: 4 → 3 → 2 → 1 → 0
```

**Списание посещений:**
- При отметке посещения в журнале `remainingVisits` уменьшается на 1
- Когда `remainingVisits` = 0, клиент больше не может посещать занятия по этому абонементу

---

## 3. Календарные абонементы

### 3.1. Концепция

**Абонемент на календарный месяц** означает, что абонемент действителен с 1-го по последнее число конкретного месяца, **независимо от даты покупки**.

**Отличие от классической модели:**
- ❌ **Классическая модель:** Абонемент на 30 дней с момента покупки
  - Купил 15 ноября → действует до 14 декабря
- ✅ **Календарная модель:** Абонемент на конкретный месяц
  - Купил 15 ноября → действует до 30 ноября
  - Цена рассчитывается пропорционально (15-30 ноября = 16 дней)

### 3.2. Поле validMonth

**Формат:** `YYYY-MM` (строка)

**Примеры:**
- `"2025-11"` - Ноябрь 2025
- `"2025-12"` - Декабрь 2025
- `"2026-01"` - Январь 2026

**Хранение в базе данных:**
```prisma
model Subscription {
  // ...
  validMonth  String  @map("valid_month")  // "2025-11"
  startDate   DateTime @map("start_date") @db.Date  // 2025-11-15
  endDate     DateTime @map("end_date") @db.Date    // 2025-11-30
  // ...
}
```

### 3.3. Расчет дат

**Алгоритм:**

```typescript
function calculateSubscriptionDates(
  purchaseDate: Date,
  validMonth: string, // "YYYY-MM"
): { startDate: Date; endDate: Date } {
  const [year, month] = validMonth.split('-').map(Number);

  // Дата начала = дата покупки
  const startDate = new Date(purchaseDate);

  // Дата окончания = последний день месяца validMonth
  const endDate = new Date(year, month, 0); // День 0 следующего месяца = последний день текущего

  return { startDate, endDate };
}
```

**Пример:**
```typescript
const purchaseDate = new Date('2025-11-15');
const validMonth = '2025-11';
const { startDate, endDate } = calculateSubscriptionDates(purchaseDate, validMonth);

// startDate = 2025-11-15
// endDate = 2025-11-30
```

---

## 4. Привязка к группе

### 4.1. Почему группа, а не студия?

**Абонемент привязан к конкретной группе**, потому что:
1. Разные группы одной студии могут иметь разную интенсивность занятий
2. Разные преподаватели
3. Разное расписание
4. Разный уровень сложности

**Пример:**
```
Студия: "Йога"
├─ Группа 1: "Йога - Начинающие" (2 раза в неделю, 8 занятий в месяц)
│  └─ Абонемент: 3000 руб./месяц
├─ Группа 2: "Йога - Продвинутые" (3 раза в неделю, 12 занятий в месяц)
│  └─ Абонемент: 5000 руб./месяц
└─ Группа 3: "Йога - Индивидуальные" (по договоренности)
   └─ Разовые посещения: 1000 руб./занятие
```

### 4.2. Структура данных

```prisma
model Subscription {
  id                  String   @id @default(uuid())
  groupId             String   @map("group_id")
  // ...
  group               Group    @relation(fields: [groupId], references: [id])
}

model SubscriptionType {
  id       String  @id @default(uuid())
  groupId  String  @map("group_id")
  // ...
  group    Group   @relation(fields: [groupId], references: [id])
}
```

### 4.3. Запись на занятия

**Клиент с абонементом может посещать только занятия той группы, к которой привязан абонемент.**

**Валидация при записи:**
```typescript
async function enrollClientToSchedule(
  clientId: string,
  scheduleId: string,
): Promise<void> {
  const schedule = await getSchedule(scheduleId);
  const subscription = await getActiveSubscription(clientId, schedule.groupId);

  if (!subscription) {
    throw new Error('У клиента нет активного абонемента для этой группы');
  }

  if (subscription.type === 'SINGLE_VISIT' && subscription.remainingVisits === 0) {
    throw new Error('У клиента закончились посещения по абонементу');
  }

  // Создать запись посещения
  await createAttendance({
    scheduleId,
    clientId,
    status: 'PRESENT',
  });

  // Списать посещение (если разовый абонемент)
  if (subscription.type === 'SINGLE_VISIT') {
    await updateSubscription(subscription.id, {
      remainingVisits: subscription.remainingVisits - 1,
    });
  }
}
```

---

## 5. Пропорциональное ценообразование

### 5.1. Принцип

Если клиент покупает абонемент **в середине месяца**, цена рассчитывается **пропорционально количеству оставшихся дней**.

**Формула:**
```
Количество дней в месяце = lastDayOfMonth(validMonth)
Оставшиеся дни = lastDayOfMonth(validMonth) - dayOfPurchase + 1
Пропорциональная цена = (Базовая цена / Дни в месяце) × Оставшиеся дни
```

### 5.2. Реализация

```typescript
function calculateProportionalPrice(
  basePrice: number,
  purchaseDate: Date,
  validMonth: string, // "YYYY-MM"
): { originalPrice: number; paidPrice: number } {
  const [year, month] = validMonth.split('-').map(Number);

  // Последний день месяца
  const lastDay = new Date(year, month, 0).getDate();

  // День покупки
  const purchaseDay = purchaseDate.getDate();

  // Оставшиеся дни (включая день покупки)
  const remainingDays = lastDay - purchaseDay + 1;

  // Пропорциональная цена
  const paidPrice = Math.round((basePrice / lastDay) * remainingDays);

  return {
    originalPrice: basePrice,  // Полная цена за месяц
    paidPrice,                 // Фактически оплаченная цена
  };
}
```

### 5.3. Примеры расчета

**Пример 1: Покупка в начале месяца**
```
Группа: "Йога - Начинающие"
Базовая цена: 5000 руб.
Месяц: Ноябрь 2025 (30 дней)
Дата покупки: 1 ноября 2025

Оставшиеся дни: 30 - 1 + 1 = 30 дней
Пропорциональная цена: (5000 / 30) × 30 = 5000 руб.
```

**Пример 2: Покупка в середине месяца**
```
Группа: "Йога - Начинающие"
Базовая цена: 5000 руб.
Месяц: Ноябрь 2025 (30 дней)
Дата покупки: 15 ноября 2025

Оставшиеся дни: 30 - 15 + 1 = 16 дней
Пропорциональная цена: (5000 / 30) × 16 = 2667 руб.
```

**Пример 3: Покупка в конце месяца**
```
Группа: "Йога - Начинающие"
Базовая цена: 5000 руб.
Месяц: Ноябрь 2025 (30 дней)
Дата покупки: 28 ноября 2025

Оставшиеся дни: 30 - 28 + 1 = 3 дня
Пропорциональная цена: (5000 / 30) × 3 = 500 руб.
```

### 5.4. Минимальное требование: 3 занятия

**Правило:** Клиент может купить абонемент только если до конца месяца осталось **минимум 3 занятия группы**.

**Обоснование:**
- Избежать покупки абонемента за 1-2 дня до конца месяца
- Гарантировать разумное использование абонемента

**Алгоритм проверки:**

```typescript
async function canPurchaseSubscription(
  groupId: string,
  purchaseDate: Date,
  validMonth: string,
): Promise<{ canPurchase: boolean; remainingClasses: number; message?: string }> {
  const [year, month] = validMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0);

  // Получить все занятия группы с purchaseDate до конца месяца
  const schedules = await prisma.schedule.findMany({
    where: {
      groupId,
      date: {
        gte: purchaseDate,
        lte: lastDay,
      },
      status: 'SCHEDULED',
    },
  });

  const remainingClasses = schedules.length;

  if (remainingClasses < 3) {
    return {
      canPurchase: false,
      remainingClasses,
      message: `До конца месяца осталось только ${remainingClasses} занятий. Минимум для покупки абонемента: 3 занятия.`,
    };
  }

  return {
    canPurchase: true,
    remainingClasses,
  };
}
```

**Пример валидации:**
```typescript
// 28 ноября 2025, осталось 2 занятия
const result = await canPurchaseSubscription(
  'group-id',
  new Date('2025-11-28'),
  '2025-11',
);

// result = {
//   canPurchase: false,
//   remainingClasses: 2,
//   message: "До конца месяца осталось только 2 занятий. Минимум для покупки абонемента: 3 занятия."
// }
```

---

## 6. Мультимесячные покупки

### 6.1. Описание

Клиент может купить абонемент **сразу на несколько месяцев вперед** (например, на 3 месяца).

**Характеристики:**
- Нет скидок за покупку на несколько месяцев
- Льготы для льготных категорий применяются
- Создается отдельная запись `Subscription` для каждого месяца

### 6.2. Структура данных

```prisma
model Subscription {
  // ...
  purchasedMonths  Int  @default(1) @map("purchased_months")  // Количество купленных месяцев
}
```

### 6.3. Алгоритм создания

```typescript
async function purchaseMultiMonthSubscription(
  clientId: string,
  groupId: string,
  subscriptionTypeId: string,
  startMonth: string, // "2025-11"
  numberOfMonths: number,
  discount: number = 0, // Процент скидки для льготных категорий
): Promise<Subscription[]> {
  const subscriptions: Subscription[] = [];
  const subscriptionType = await getSubscriptionType(subscriptionTypeId);

  for (let i = 0; i < numberOfMonths; i++) {
    // Рассчитать месяц
    const [year, month] = startMonth.split('-').map(Number);
    const targetDate = new Date(year, month - 1 + i, 1);
    const validMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    // Первый месяц может быть пропорциональным
    const purchaseDate = i === 0 ? new Date() : new Date(year, month - 1 + i, 1);

    // Рассчитать цену
    const { originalPrice, paidPrice } = calculateProportionalPrice(
      subscriptionType.price,
      purchaseDate,
      validMonth,
    );

    // Применить скидку
    const finalPrice = Math.round(paidPrice * (1 - discount / 100));

    // Создать абонемент
    const subscription = await prisma.subscription.create({
      data: {
        clientId,
        groupId,
        subscriptionTypeId,
        validMonth,
        purchaseDate,
        startDate: purchaseDate,
        endDate: new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0),
        originalPrice,
        paidPrice: finalPrice,
        purchasedMonths: numberOfMonths,
        status: 'ACTIVE',
      },
    });

    subscriptions.push(subscription);
  }

  return subscriptions;
}
```

### 6.4. Пример

**Клиент покупает абонемент на 3 месяца:**
```
Группа: "Йога - Начинающие"
Базовая цена: 5000 руб./месяц
Дата покупки: 15 ноября 2025
Количество месяцев: 3
Льготная категория: 20% скидка

Месяц 1 (Ноябрь 2025):
- Период: 15.11.2025 - 30.11.2025 (16 дней)
- Базовая цена: 5000 руб.
- Пропорциональная цена: (5000 / 30) × 16 = 2667 руб.
- Цена со скидкой: 2667 × 0.8 = 2134 руб.

Месяц 2 (Декабрь 2025):
- Период: 01.12.2025 - 31.12.2025 (31 день)
- Базовая цена: 5000 руб.
- Пропорциональная цена: 5000 руб.
- Цена со скидкой: 5000 × 0.8 = 4000 руб.

Месяц 3 (Январь 2026):
- Период: 01.01.2026 - 31.01.2026 (31 день)
- Базовая цена: 5000 руб.
- Пропорциональная цена: 5000 руб.
- Цена со скидкой: 5000 × 0.8 = 4000 руб.

Итого: 2134 + 4000 + 4000 = 10134 руб.
```

---

## 7. Компенсации по болезни

### 7.1. Описание

Если клиент пропустил занятия **по болезни** и предоставил **медицинскую справку**, система автоматически рассчитывает компенсацию.

**Формула компенсации:**
```
Стоимость одного занятия = Цена абонемента / Количество занятий в месяце
Сумма компенсации = Стоимость одного занятия × Количество пропущенных занятий
```

### 7.2. Процесс компенсации

```
1. Клиент пропустил занятия по болезни
   ├─ Менеджер отмечает отсутствие в журнале посещаемости
   │
2. Клиент приносит медицинскую справку
   ├─ Менеджер создает заявку на компенсацию
   ├─ Загружает скан справки
   ├─ Указывает количество пропущенных занятий
   │
3. Система автоматически рассчитывает сумму компенсации
   │
4. Менеджер/Администратор рассматривает заявку
   ├─ Одобряет → Компенсация зачисляется клиенту
   └─ Отклоняет → Указывает причину
```

### 7.3. Модель данных

```prisma
enum CompensationStatus {
  PENDING   // Ожидает рассмотрения
  APPROVED  // Одобрена
  REJECTED  // Отклонена
}

model SubscriptionCompensation {
  id                      String              @id @default(uuid())
  subscriptionId          String              @map("subscription_id")
  compensationDate        DateTime            @map("compensation_date") @db.Date
  missedClasses           Int                 @map("missed_classes")
  compensationAmount      Decimal             @map("compensation_amount") @db.Decimal(10, 2)
  medicalCertificateUrl   String?             @map("medical_certificate_url")
  reason                  String?             @db.Text
  status                  CompensationStatus  @default(PENDING)
  processedBy             String?             @map("processed_by")
  processedAt             DateTime?           @map("processed_at")
  notes                   String?             @db.Text
  createdAt               DateTime            @default(now()) @map("created_at")
  updatedAt               DateTime            @updatedAt @map("updated_at")

  subscription            Subscription        @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
}
```

### 7.4. Расчет компенсации

```typescript
async function calculateCompensation(
  subscriptionId: string,
  missedClasses: number,
): Promise<number> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { group: { include: { schedules: true } } },
  });

  if (!subscription) {
    throw new Error('Абонемент не найден');
  }

  // Получить количество занятий в месяце абонемента
  const [year, month] = subscription.validMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const totalClasses = await prisma.schedule.count({
    where: {
      groupId: subscription.groupId,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'SCHEDULED',
    },
  });

  if (totalClasses === 0) {
    throw new Error('В этом месяце нет занятий для этой группы');
  }

  // Рассчитать стоимость одного занятия
  const pricePerClass = subscription.paidPrice.toNumber() / totalClasses;

  // Рассчитать компенсацию
  const compensationAmount = Math.round(pricePerClass * missedClasses);

  return compensationAmount;
}
```

### 7.5. Создание заявки на компенсацию

```typescript
async function createCompensation(data: {
  subscriptionId: string;
  missedClasses: number;
  medicalCertificateFile: File;
  reason?: string;
}): Promise<SubscriptionCompensation> {
  // Загрузить медицинскую справку
  const certificateUrl = await uploadFile(data.medicalCertificateFile, 'medical-certificates');

  // Рассчитать сумму компенсации
  const compensationAmount = await calculateCompensation(
    data.subscriptionId,
    data.missedClasses,
  );

  // Создать заявку
  const compensation = await prisma.subscriptionCompensation.create({
    data: {
      subscriptionId: data.subscriptionId,
      compensationDate: new Date(),
      missedClasses: data.missedClasses,
      compensationAmount,
      medicalCertificateUrl: certificateUrl,
      reason: data.reason,
      status: 'PENDING',
    },
  });

  return compensation;
}
```

### 7.6. Обработка заявки (одобрение/отклонение)

```typescript
async function processCompensation(
  compensationId: string,
  action: 'APPROVE' | 'REJECT',
  userId: string,
  notes?: string,
): Promise<SubscriptionCompensation> {
  const compensation = await prisma.subscriptionCompensation.findUnique({
    where: { id: compensationId },
    include: { subscription: true },
  });

  if (!compensation) {
    throw new Error('Заявка на компенсацию не найдена');
  }

  if (compensation.status !== 'PENDING') {
    throw new Error('Заявка уже обработана');
  }

  const updatedCompensation = await prisma.subscriptionCompensation.update({
    where: { id: compensationId },
    data: {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      processedBy: userId,
      processedAt: new Date(),
      notes,
    },
  });

  if (action === 'APPROVE') {
    // Создать платеж-возврат (компенсацию)
    await prisma.payment.create({
      data: {
        clientId: compensation.subscription.clientId,
        amount: compensation.compensationAmount.negated(), // Отрицательная сумма = возврат
        paymentMethod: 'CASH', // Или другой метод
        paymentType: 'SUBSCRIPTION',
        status: 'COMPLETED',
        subscriptionId: compensation.subscriptionId,
        notes: `Компенсация за ${compensation.missedClasses} пропущенных занятий по болезни`,
      },
    });
  }

  return updatedCompensation;
}
```

### 7.7. Пример расчета

**Сценарий:**
```
Абонемент: "Йога - Начинающие (безлимит)"
Месяц: Ноябрь 2025
Оплачено: 5000 руб.
Количество занятий в месяце: 12
Пропущено по болезни: 3 занятия

Расчет:
Стоимость одного занятия = 5000 / 12 ≈ 417 руб.
Компенсация = 417 × 3 = 1251 руб.
```

---

## 8. Льготные категории

### 8.1. Описание

Некоторые клиенты могут иметь право на **льготы** (скидки) при покупке абонементов.

**Примеры льготных категорий:**
- Пенсионеры
- Многодетные семьи
- Студенты
- Дети из малообеспеченных семей

### 8.2. Реализация

**Добавить поле в Client:**
```prisma
model Client {
  // ...
  discountPercentage  Int?  @default(0) @map("discount_percentage")  // Процент скидки (0-100)
  discountCategory    String? @map("discount_category")  // Категория льготы
  discountDocument    String? @map("discount_document")  // Ссылка на подтверждающий документ
}
```

**Применение скидки при покупке:**
```typescript
async function purchaseSubscription(data: {
  clientId: string;
  groupId: string;
  subscriptionTypeId: string;
  validMonth: string;
}): Promise<Subscription> {
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });

  const subscriptionType = await prisma.subscriptionType.findUnique({
    where: { id: data.subscriptionTypeId },
  });

  // Рассчитать пропорциональную цену
  const { originalPrice, paidPrice } = calculateProportionalPrice(
    subscriptionType.price.toNumber(),
    new Date(),
    data.validMonth,
  );

  // Применить льготу
  const discount = client.discountPercentage || 0;
  const finalPrice = Math.round(paidPrice * (1 - discount / 100));

  // Создать абонемент
  const subscription = await prisma.subscription.create({
    data: {
      ...data,
      purchaseDate: new Date(),
      startDate: new Date(),
      endDate: calculateEndDate(data.validMonth),
      originalPrice,
      paidPrice: finalPrice,
      status: 'ACTIVE',
    },
  });

  return subscription;
}
```

---

## 9. UI/UX спецификация

### 9.1. Форма покупки абонемента

**Расположение:** `/subscriptions/new` или модальное окно

**Поля формы:**

```typescript
interface SubscriptionPurchaseForm {
  clientId: string;           // Выбор клиента (поиск)
  groupId: string;            // Выбор группы
  subscriptionTypeId: string; // Выбор типа абонемента (безлимит/разовые)
  validMonth: string;         // Выбор месяца (датапикер, только месяц и год)
  numberOfMonths: number;     // Количество месяцев (по умолчанию 1)
}
```

**UI Mockup:**

```
╔════════════════════════════════════════════════════════════╗
║         Покупка абонемента                             [X] ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Клиент: *                                                 ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ 🔍 Поиск клиента по имени, телефону...              │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  Группа: *                                                 ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ Йога - Начинающие                                ▼  │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  Тип абонемента: *                                         ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ ○ Безлимитный (5000 руб./месяц)                     │ ║
║  │ ○ Разовые посещения (500 руб./занятие)              │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  Месяц: *                                                  ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ 📅 Ноябрь 2025                                    ▼  │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  Количество месяцев:                                       ║
║  ┌──────┐                                                  ║
║  │  1   │ [−] [+]                                         ║
║  └──────┘                                                  ║
║                                                            ║
║  ╔════════════════════════════════════════════════════╗   ║
║  ║  📊 Расчет стоимости                               ║   ║
║  ╠════════════════════════════════════════════════════╣   ║
║  ║  Дата покупки: 15 ноября 2025                      ║   ║
║  ║  Период действия: 15.11.2025 - 30.11.2025         ║   ║
║  ║  Оставшиеся дни: 16 из 30                          ║   ║
║  ║  Количество занятий: 6 из 12                       ║   ║
║  ║                                                     ║   ║
║  ║  Полная цена: 5000 руб.                            ║   ║
║  ║  Пропорциональная цена: 2667 руб.                  ║   ║
║  ║  Льгота (20%): −533 руб.                           ║   ║
║  ║  ─────────────────────────────────────────────────  ║   ║
║  ║  Итого к оплате: 2134 руб.                         ║   ║
║  ╚════════════════════════════════════════════════════╝   ║
║                                                            ║
║  ⚠️ Внимание: До конца месяца осталось 6 занятий         ║
║     (минимум для покупки: 3)                              ║
║                                                            ║
║                                                            ║
║              [Отмена]           [Оформить покупку]        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Интерактивные элементы:**

1. **Выбор месяца** → Автоматически рассчитывается пропорциональная цена
2. **Выбор группы** → Загружаются доступные типы абонементов
3. **Изменение количества месяцев** → Пересчитывается итоговая стоимость
4. **Валидация** → Проверка минимального количества оставшихся занятий (3)

### 9.2. Карточка абонемента (просмотр)

**Расположение:** `/subscriptions/:id` или модальное окно

**UI Mockup:**

```
╔════════════════════════════════════════════════════════════╗
║  Абонемент #SUB-20251115-0001                         [X]  ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  👤 Клиент                                                 ║
║  ─────────────────────────────────────────────────────────║
║  Иванова Мария Петровна                                   ║
║  📞 +7 (999) 123-45-67                                    ║
║  ✉️ maria@example.com                                     ║
║                                                            ║
║  🎨 Группа                                                 ║
║  ─────────────────────────────────────────────────────────║
║  Йога - Начинающие                                        ║
║  Преподаватель: Соколова Анна Владимировна                ║
║                                                            ║
║  📅 Период действия                                        ║
║  ─────────────────────────────────────────────────────────║
║  Месяц: Ноябрь 2025                                       ║
║  С 15.11.2025 по 30.11.2025                               ║
║  Статус: 🟢 Активен                                       ║
║                                                            ║
║  💰 Финансы                                                ║
║  ─────────────────────────────────────────────────────────║
║  Полная цена: 5000 руб.                                   ║
║  Оплачено: 2134 руб. (16 дней из 30)                      ║
║  Льгота: 20% (−533 руб.)                                  ║
║                                                            ║
║  📊 Посещаемость                                           ║
║  ─────────────────────────────────────────────────────────║
║  Тип: Безлимитный                                         ║
║  Посещено занятий: 4 из 6                                 ║
║  Пропущено: 1 (по болезни: 1)                             ║
║                                                            ║
║  💊 Компенсации                                            ║
║  ─────────────────────────────────────────────────────────║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ 📄 Компенсация #COMP-001                           │   ║
║  │ Дата: 20.11.2025                                   │   ║
║  │ Пропущено: 1 занятие                               │   ║
║  │ Сумма: 417 руб.                                    │   ║
║  │ Статус: ⏳ Ожидает рассмотрения                    │   ║
║  │                            [Просмотреть]           │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║                                                            ║
║     [Создать компенсацию]  [История платежей]  [Закрыть]  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### 9.3. Форма создания компенсации

**Расположение:** Модальное окно из карточки абонемента

**UI Mockup:**

```
╔════════════════════════════════════════════════════════════╗
║         Создать заявку на компенсацию                  [X] ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Абонемент: Йога - Начинающие (Ноябрь 2025)               ║
║  Клиент: Иванова Мария Петровна                           ║
║                                                            ║
║  Количество пропущенных занятий: *                         ║
║  ┌──────┐                                                  ║
║  │  1   │ [−] [+]                                         ║
║  └──────┘                                                  ║
║                                                            ║
║  Медицинская справка: *                                    ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ 📎 Выберите файл...                                  │ ║
║  └──────────────────────────────────────────────────────┘ ║
║  (Форматы: PDF, JPG, PNG. Макс. размер: 5 МБ)            ║
║                                                            ║
║  Причина (дополнительно):                                  ║
║  ┌──────────────────────────────────────────────────────┐ ║
║  │ ОРВИ, справка от 18.11.2025                          │ ║
║  │                                                       │ ║
║  └──────────────────────────────────────────────────────┘ ║
║                                                            ║
║  ╔════════════════════════════════════════════════════╗   ║
║  ║  📊 Расчет компенсации                             ║   ║
║  ╠════════════════════════════════════════════════════╣   ║
║  ║  Оплачено за абонемент: 2134 руб.                  ║   ║
║  ║  Занятий в месяце: 6                               ║   ║
║  ║  Стоимость 1 занятия: 356 руб.                     ║   ║
║  ║                                                     ║   ║
║  ║  Пропущено занятий: 1                              ║   ║
║  ║  ─────────────────────────────────────────────────  ║   ║
║  ║  Сумма компенсации: 356 руб.                       ║   ║
║  ╚════════════════════════════════════════════════════╝   ║
║                                                            ║
║                                                            ║
║              [Отмена]           [Создать заявку]          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### 9.4. Список абонементов клиента

**Расположение:** В карточке клиента, вкладка "Абонементы"

**UI Mockup:**

```
╔════════════════════════════════════════════════════════════════════════╗
║  Абонементы клиента: Иванова Мария Петровна                           ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  [+ Купить новый абонемент]                              Фильтры: ▼  ║
║                                                                        ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ 🟢 АКТИВЕН                        #SUB-20251115-0001             │ ║
║  ├──────────────────────────────────────────────────────────────────┤ ║
║  │ 📅 Ноябрь 2025 (15.11 - 30.11)                                  │ ║
║  │ 🎨 Йога - Начинающие (Безлимит)                                 │ ║
║  │ 💰 Оплачено: 2134 руб. (полная цена: 5000 руб.)                 │ ║
║  │ 📊 Посещено: 4 из 6 занятий                                     │ ║
║  │                                                                  │ ║
║  │                  [Подробнее]  [Создать компенсацию]             │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║  ┌──────────────────────────────────────────────────────────────────┐ ║
║  │ 🔴 ИСТЕК                          #SUB-20251001-0015             │ ║
║  ├──────────────────────────────────────────────────────────────────┤ ║
║  │ 📅 Октябрь 2025 (01.10 - 31.10)                                 │ ║
║  │ 🎨 Йога - Начинающие (Безлимит)                                 │ ║
║  │ 💰 Оплачено: 5000 руб.                                           │ ║
║  │ 📊 Посещено: 11 из 12 занятий                                   │ ║
║  │ 💊 Компенсировано: 1 занятие (417 руб.)                         │ ║
║  │                                                                  │ ║
║  │                                         [Подробнее]              │ ║
║  └──────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 10. API Endpoints

### 10.1. Типы абонементов (Subscription Types)

#### `GET /api/subscription-types`

Получить список всех типов абонементов.

**Query параметры:**
- `groupId` (optional) - Фильтр по группе
- `isActive` (optional) - Фильтр по активности

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Йога - Начинающие (Безлимит)",
      "description": "Безлимитные занятия йогой для начинающих",
      "groupId": "uuid",
      "type": "UNLIMITED",
      "price": 5000.00,
      "isActive": true,
      "group": {
        "id": "uuid",
        "name": "Йога - Начинающие",
        "teacher": {
          "firstName": "Анна",
          "lastName": "Соколова"
        }
      }
    }
  ]
}
```

#### `POST /api/subscription-types`

Создать новый тип абонемента.

**Request Body:**
```json
{
  "name": "Йога - Начинающие (Безлимит)",
  "description": "Безлимитные занятия йогой для начинающих",
  "groupId": "uuid",
  "type": "UNLIMITED",
  "price": 5000.00
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Йога - Начинающие (Безлимит)",
    "groupId": "uuid",
    "type": "UNLIMITED",
    "price": 5000.00,
    "isActive": true,
    "createdAt": "2025-11-15T10:00:00Z"
  }
}
```

### 10.2. Абонементы (Subscriptions)

#### `GET /api/subscriptions`

Получить список абонементов.

**Query параметры:**
- `clientId` (optional) - Фильтр по клиенту
- `groupId` (optional) - Фильтр по группе
- `status` (optional) - Фильтр по статусу (ACTIVE, EXPIRED, FROZEN, COMPENSATED)
- `validMonth` (optional) - Фильтр по месяцу (формат: YYYY-MM)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "subscriptionTypeId": "uuid",
      "groupId": "uuid",
      "validMonth": "2025-11",
      "purchaseDate": "2025-11-15",
      "startDate": "2025-11-15",
      "endDate": "2025-11-30",
      "originalPrice": 5000.00,
      "paidPrice": 2134.00,
      "remainingVisits": null,
      "purchasedMonths": 1,
      "status": "ACTIVE",
      "client": {
        "firstName": "Мария",
        "lastName": "Иванова",
        "phone": "+79991234567"
      },
      "subscriptionType": {
        "name": "Йога - Начинающие (Безлимит)",
        "type": "UNLIMITED"
      },
      "group": {
        "name": "Йога - Начинающие"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 45
  }
}
```

#### `GET /api/subscriptions/:id`

Получить детали абонемента.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "clientId": "uuid",
    "subscriptionTypeId": "uuid",
    "groupId": "uuid",
    "validMonth": "2025-11",
    "purchaseDate": "2025-11-15",
    "startDate": "2025-11-15",
    "endDate": "2025-11-30",
    "originalPrice": 5000.00,
    "paidPrice": 2134.00,
    "remainingVisits": null,
    "purchasedMonths": 1,
    "status": "ACTIVE",
    "createdAt": "2025-11-15T10:00:00Z",
    "client": { /* ... */ },
    "subscriptionType": { /* ... */ },
    "group": { /* ... */ },
    "payments": [ /* ... */ ],
    "compensations": [ /* ... */ ],
    "attendances": [ /* ... */ ]
  }
}
```

#### `POST /api/subscriptions`

Купить новый абонемент.

**Request Body:**
```json
{
  "clientId": "uuid",
  "groupId": "uuid",
  "subscriptionTypeId": "uuid",
  "validMonth": "2025-11",
  "numberOfMonths": 1
}
```

**Response:**
```json
{
  "data": {
    "subscriptions": [
      {
        "id": "uuid",
        "validMonth": "2025-11",
        "paidPrice": 2134.00,
        "status": "ACTIVE"
      }
    ],
    "totalAmount": 2134.00,
    "payment": {
      "id": "uuid",
      "amount": 2134.00,
      "status": "PENDING"
    }
  }
}
```

#### `POST /api/subscriptions/calculate-price`

Рассчитать цену абонемента (перед покупкой).

**Request Body:**
```json
{
  "clientId": "uuid",
  "subscriptionTypeId": "uuid",
  "validMonth": "2025-11",
  "numberOfMonths": 1
}
```

**Response:**
```json
{
  "data": {
    "basePrice": 5000.00,
    "proportionalPrice": 2667.00,
    "discount": 20,
    "discountAmount": 533.00,
    "finalPrice": 2134.00,
    "purchaseDate": "2025-11-15",
    "startDate": "2025-11-15",
    "endDate": "2025-11-30",
    "remainingDays": 16,
    "totalDaysInMonth": 30,
    "remainingClasses": 6,
    "canPurchase": true
  }
}
```

#### `POST /api/subscriptions/validate-purchase`

Проверить возможность покупки абонемента (минимум 3 занятия).

**Request Body:**
```json
{
  "groupId": "uuid",
  "validMonth": "2025-11",
  "purchaseDate": "2025-11-28"
}
```

**Response (успех):**
```json
{
  "data": {
    "canPurchase": true,
    "remainingClasses": 4,
    "message": "Абонемент можно купить"
  }
}
```

**Response (ошибка):**
```json
{
  "data": {
    "canPurchase": false,
    "remainingClasses": 2,
    "message": "До конца месяца осталось только 2 занятий. Минимум для покупки абонемента: 3 занятия."
  }
}
```

### 10.3. Компенсации (Compensations)

#### `GET /api/compensations`

Получить список заявок на компенсацию.

**Query параметры:**
- `subscriptionId` (optional)
- `status` (optional) - PENDING, APPROVED, REJECTED

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "subscriptionId": "uuid",
      "compensationDate": "2025-11-20",
      "missedClasses": 1,
      "compensationAmount": 417.00,
      "medicalCertificateUrl": "/uploads/certificates/...",
      "reason": "ОРВИ",
      "status": "PENDING",
      "createdAt": "2025-11-20T14:30:00Z",
      "subscription": {
        "validMonth": "2025-11",
        "client": {
          "firstName": "Мария",
          "lastName": "Иванова"
        },
        "group": {
          "name": "Йога - Начинающие"
        }
      }
    }
  ]
}
```

#### `POST /api/compensations`

Создать заявку на компенсацию.

**Request Body (multipart/form-data):**
```
subscriptionId: uuid
missedClasses: 1
reason: "ОРВИ, справка от 18.11.2025"
medicalCertificate: [FILE]
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "subscriptionId": "uuid",
    "missedClasses": 1,
    "compensationAmount": 417.00,
    "status": "PENDING",
    "createdAt": "2025-11-20T14:30:00Z"
  }
}
```

#### `POST /api/compensations/:id/process`

Обработать заявку на компенсацию (одобрить/отклонить).

**Request Body:**
```json
{
  "action": "APPROVE",  // или "REJECT"
  "notes": "Справка проверена, компенсация одобрена"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "status": "APPROVED",
    "processedBy": "uuid",
    "processedAt": "2025-11-21T10:00:00Z",
    "notes": "Справка проверена, компенсация одобрена"
  }
}
```

---

## 11. Бизнес-логика и валидация

### 11.1. Правила валидации

#### При создании типа абонемента:
1. `groupId` должен существовать
2. `price` > 0
3. `name` уникален для группы

#### При покупке абонемента:
1. Клиент существует и активен
2. Группа существует и активна
3. Тип абонемента существует и активен
4. Месяц `validMonth` >= текущего месяца
5. До конца месяца осталось минимум 3 занятия (если покупается текущий месяц)
6. У клиента нет активного абонемента на эту группу и этот месяц

#### При создании компенсации:
1. Абонемент существует
2. `missedClasses` > 0
3. `missedClasses` <= количество занятий в месяце
4. Загружена медицинская справка
5. Абонемент относится к текущему или прошедшему месяцу

#### При обработке компенсации:
1. Компенсация существует
2. Статус = PENDING
3. Только ADMIN или MANAGER может обрабатывать

### 11.2. Автоматические процессы

#### Истечение абонементов

**Задача (cron job):** Ежедневно в 00:00

```typescript
async function expireSubscriptions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Найти все активные абонементы с endDate < today
  const expiredSubscriptions = await prisma.subscription.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        lt: today,
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  console.log(`Expired ${expiredSubscriptions.count} subscriptions`);
}
```

#### Уведомления об истечении

**Задача (cron job):** Ежедневно в 10:00

```typescript
async function notifyExpiringSubscriptions() {
  const today = new Date();
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);

  // Найти абонементы, которые истекают через 3 дня
  const expiringSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        gte: today,
        lte: in3Days,
      },
    },
    include: {
      client: true,
      group: true,
    },
  });

  for (const subscription of expiringSubscriptions) {
    // Отправить email/SMS уведомление
    await sendNotification(subscription.client, {
      subject: 'Ваш абонемент скоро истечет',
      body: `Ваш абонемент "${subscription.group.name}" действует до ${subscription.endDate}. Продлите абонемент!`,
    });
  }
}
```

---

## 12. Примеры использования

### 12.1. Сценарий 1: Покупка абонемента в начале месяца

**Данные:**
- Клиент: Иванова Мария Петровна
- Группа: "Йога - Начинающие"
- Тип: Безлимитный
- Базовая цена: 5000 руб.
- Дата покупки: 1 ноября 2025
- Льгота: нет

**Процесс:**

1. Клиент обращается в центр 1 ноября 2025
2. Менеджер открывает форму покупки абонемента
3. Выбирает клиента "Иванова Мария Петровна"
4. Выбирает группу "Йога - Начинающие"
5. Выбирает тип "Безлимитный (5000 руб./месяц)"
6. Выбирает месяц "Ноябрь 2025"
7. Система рассчитывает:
   - Оставшиеся дни: 30 - 1 + 1 = 30 дней
   - Цена: (5000 / 30) × 30 = 5000 руб.
8. Менеджер подтверждает покупку
9. Создается запись `Subscription`:
   ```json
   {
     "clientId": "client-uuid",
     "groupId": "group-uuid",
     "subscriptionTypeId": "type-uuid",
     "validMonth": "2025-11",
     "purchaseDate": "2025-11-01",
     "startDate": "2025-11-01",
     "endDate": "2025-11-30",
     "originalPrice": 5000.00,
     "paidPrice": 5000.00,
     "remainingVisits": null,
     "status": "ACTIVE"
   }
   ```
10. Создается платеж на 5000 руб.

### 12.2. Сценарий 2: Покупка абонемента в середине месяца с льготой

**Данные:**
- Клиент: Петрова Анна Ивановна (пенсионерка, льгота 20%)
- Группа: "Йога - Начинающие"
- Тип: Безлимитный
- Базовая цена: 5000 руб.
- Дата покупки: 15 ноября 2025
- Льгота: 20%

**Процесс:**

1. Клиент обращается в центр 15 ноября 2025
2. Менеджер открывает форму покупки абонемента
3. Выбирает клиента "Петрова Анна Ивановна"
4. Система автоматически применяет льготу 20%
5. Выбирает группу "Йога - Начинающие"
6. Выбирает тип "Безлимитный (5000 руб./месяц)"
7. Выбирает месяц "Ноябрь 2025"
8. Система рассчитывает:
   - Оставшиеся дни: 30 - 15 + 1 = 16 дней
   - Пропорциональная цена: (5000 / 30) × 16 = 2667 руб.
   - Льгота 20%: 2667 × 0.8 = 2134 руб.
9. Менеджер подтверждает покупку
10. Создается абонемент с `paidPrice` = 2134 руб.

### 12.3. Сценарий 3: Мультимесячная покупка

**Данные:**
- Клиент: Сидоров Петр Николаевич
- Группа: "Йога - Начинающие"
- Тип: Безлимитный
- Базовая цена: 5000 руб.
- Дата покупки: 15 ноября 2025
- Количество месяцев: 3
- Льгота: нет

**Процесс:**

1. Клиент покупает абонемент на 3 месяца
2. Система создает 3 записи `Subscription`:
   - **Ноябрь 2025:** 15.11 - 30.11 (16 дней), цена 2667 руб.
   - **Декабрь 2025:** 01.12 - 31.12 (31 день), цена 5000 руб.
   - **Январь 2026:** 01.01 - 31.01 (31 день), цена 5000 руб.
3. Итоговая сумма: 2667 + 5000 + 5000 = 12667 руб.
4. Создается один платеж на 12667 руб.

### 12.4. Сценарий 4: Компенсация по болезни

**Данные:**
- Клиент: Иванова Мария Петровна
- Абонемент: "Йога - Начинающие (Ноябрь 2025)"
- Оплачено: 5000 руб.
- Пропущено занятий: 3 из 12

**Процесс:**

1. Клиент пропустил 3 занятия по болезни (15, 17, 19 ноября)
2. Клиент приносит медицинскую справку 20 ноября
3. Менеджер открывает карточку абонемента
4. Нажимает "Создать компенсацию"
5. Заполняет форму:
   - Пропущено занятий: 3
   - Загружает скан справки
   - Причина: "ОРВИ, справка от 18.11.2025"
6. Система автоматически рассчитывает:
   - Стоимость 1 занятия: 5000 / 12 = 417 руб.
   - Компенсация: 417 × 3 = 1251 руб.
7. Создается заявка со статусом "PENDING"
8. Администратор рассматривает заявку
9. Одобряет компенсацию
10. Система создает возврат платежа на 1251 руб.
11. Клиент получает компенсацию

---

**Конец документа**
