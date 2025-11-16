# МОДУЛЬ СЧЕТОВ (INVOICES MODULE)

## Содержание

1. [Обзор модуля](#обзор-модуля)
2. [Основные концепции](#основные-концепции)
3. [Модели данных](#модели-данных)
4. [Бизнес-логика](#бизнес-логика)
5. [API Endpoints](#api-endpoints)
6. [Интеграция с другими модулями](#интеграция-с-другими-модулями)
7. [Примеры использования](#примеры-использования)
8. [Обработка особых случаев](#обработка-особых-случаев)

---

## Обзор модуля

### Назначение

Модуль счетов является **центральным элементом финансовой системы** ArtSvao, обеспечивающим учет всех взаиморасчетов с клиентами (физическими и юридическими лицами).

### Основные функции

- **Формирование счетов** на оплату услуг (абонементы, аренда, прочие услуги)
- **Управление статусами** счетов (оплачен/не оплачен)
- **Применение скидок** на основе льготных категорий
- **Корректировка цен** с обязательным указанием причины и ведением аудита
- **Гибкая логика списания** услуг (при продаже или при использовании)
- **Автоматическое создание** счетов при продлении абонементов
- **Ручное создание** счетов менеджерами
- **Интеграция с платежами** для отслеживания оплат

### Место в системе

```
┌─────────────────┐
│   КЛИЕНТ        │
└────────┬────────┘
         │
         │ записывается в группу / бронирует аренду
         ↓
┌─────────────────────────────────────┐
│   АБОНЕМЕНТ / АРЕНДА / УСЛУГА       │
└────────────┬────────────────────────┘
             │
             │ создается
             ↓
     ┌───────────────┐
     │    СЧЕТ       │ ← Центральная сущность
     │   (Invoice)   │
     └───────┬───────┘
             │
             │ оплачивается
             ↓
     ┌───────────────┐
     │   ПЛАТЕЖ      │
     │   (Payment)   │
     └───────────────┘
```

### Связи с другими модулями

- **Модуль клиентов** — счета выставляются клиентам
- **Модуль абонементов** — счета для продажи и продления абонементов
- **Модуль аренды** — счета за аренду помещений
- **Модуль номенклатуры** — услуги из справочника попадают в счета
- **Модуль платежей** — оплата счетов
- **Модуль льготных категорий** — применение скидок

---

## Основные концепции

### 1. Счет (Invoice)

**Счет** — документ, который:
- Выставляется клиенту на оплату услуг
- Содержит одну или несколько позиций (InvoiceItem)
- Имеет статус (не оплачен / оплачен)
- Может быть создан автоматически или вручную
- Связан с конкретным клиентом
- Может быть связан с абонементом или арендой

### 2. Позиция счета (InvoiceItem)

**Позиция счета** — отдельная услуга в счете:
- Ссылка на номенклатуру услуги
- Количество
- Базовая цена
- Скидка (если применяется)
- Итоговая сумма
- **Логика списания** (при продаже / при использовании)
- Статус списания (для услуг с отложенным списанием)

### 3. Логика списания

Услуги могут списываться в разные моменты:

| Тип услуги | Момент списания | Пример |
|------------|----------------|--------|
| **Абонемент студии** | При использовании (поштучно) | После каждого посещения списывается 1 занятие |
| **Разовое занятие** | При продаже | Сразу после оплаты счета |
| **Аренда почасовая** | При продаже | Сразу после оплаты |
| **Коворкинг многодневный** | При использовании (ежедневно) | Каждый день списывается 1 день |
| **Пробное занятие** | При продаже | Сразу после оплаты |

**Настройка:** Каждая номенклатурная позиция имеет поле `writeOffTiming`:
- `ON_SALE` — списание при продаже (оплате счета)
- `ON_USE` — списание при фактическом использовании

### 4. Льготные категории и скидки

**Льготная категория** — характеристика клиента, дающая право на скидку:
- Многодетная семья — 30%
- Инвалид — 50%
- Пенсионер — 20%
- Сотрудник — 100%

**Применение:**
1. Клиенту присваивается льготная категория
2. При создании счета автоматически рассчитывается скидка
3. Скидка отображается в каждой позиции счета
4. Менеджер может изменить итоговую сумму вручную с указанием причины

### 5. Корректировка цен и аудит

**Корректировка цены** — изменение менеджером цены в счете:
- Может быть применена к любой позиции
- Требует обязательного указания причины
- Все изменения логируются в журнал аудита (InvoiceAuditLog)
- Журнал хранит: кто, когда, старую цену, новую цену, причину

### 6. Статусы счета

```
DRAFT (Черновик)
  ↓
PENDING (Ожидает оплаты) ← счет выставлен клиенту
  ↓
PAID (Оплачен) ← платеж получен
```

Дополнительные статусы:
- `OVERDUE` — просрочен (если дата оплаты прошла)
- `CANCELLED` — отменен
- `PARTIALLY_PAID` — частично оплачен

### 7. Автоматическое создание счетов

**Счета создаются автоматически:**
1. **При продлении абонемента** — за 7 дней до окончания срока действия
2. **При создании заявки на аренду** (опционально, если настроено)
3. **При продаже абонемента** — сразу при записи клиента в группу

**Счета создаются вручную:**
1. Менеджером для любых услуг
2. Для аренды (если автосоздание отключено)
3. Для прочих услуг (индивидуальные занятия, мероприятия)

---

## Модели данных

### 1. Invoice (Счет)

```prisma
model Invoice {
  id              String         @id @default(uuid())
  invoiceNumber   String         @unique @map("invoice_number") // Номер счета (автоинкремент)
  clientId        String         @map("client_id")
  subscriptionId  String?        @map("subscription_id")  // Если счет за абонемент
  rentalId        String?        @map("rental_id")        // Если счет за аренду

  // Финансовые данные
  subtotal        Decimal        @db.Decimal(10, 2)  // Сумма до скидки
  discountAmount  Decimal        @default(0) @map("discount_amount") @db.Decimal(10, 2)
  totalAmount     Decimal        @map("total_amount") @db.Decimal(10, 2)  // Итоговая сумма

  // Статусы и даты
  status          InvoiceStatus  @default(PENDING)
  issuedAt        DateTime       @default(now()) @map("issued_at")
  dueDate         DateTime?      @map("due_date") @db.Date  // Срок оплаты
  paidAt          DateTime?      @map("paid_at")

  // Дополнительная информация
  notes           String?        @db.Text  // Примечания менеджера
  createdBy       String?        @map("created_by")  // ID пользователя, создавшего счет

  // Системные поля
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  // Связи
  client          Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  subscription    Subscription?  @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
  rental          Rental?        @relation(fields: [rentalId], references: [id], onDelete: SetNull)
  creator         User?          @relation("InvoiceCreator", fields: [createdBy], references: [id], onDelete: SetNull)

  items           InvoiceItem[]
  payments        Payment[]
  auditLogs       InvoiceAuditLog[]

  @@index([clientId])
  @@index([subscriptionId])
  @@index([rentalId])
  @@index([status])
  @@index([issuedAt])
  @@index([dueDate])
  @@map("invoices")
}

enum InvoiceStatus {
  DRAFT           // Черновик
  PENDING         // Ожидает оплаты
  PAID            // Оплачен
  PARTIALLY_PAID  // Частично оплачен
  OVERDUE         // Просрочен
  CANCELLED       // Отменен
}
```

### 2. InvoiceItem (Позиция счета)

```prisma
model InvoiceItem {
  id                 String            @id @default(uuid())
  invoiceId          String            @map("invoice_id")

  // Услуга (связь с номенклатурой)
  serviceId          String?           @map("service_id")           // Ссылка на Service (модуль номенклатуры)
  serviceType        ServiceType       @map("service_type")         // Тип услуги (копия из Service)
  serviceName        String            @map("service_name")         // Название услуги (копия)
  serviceDescription String?           @map("service_description")  // Описание (копия)

  // Ссылки на источник (для обратной совместимости, одна из)
  subscriptionTypeId String?           @map("subscription_type_id")  // Тип абонемента (устаревшее)
  roomId             String?           @map("room_id")               // Помещение (устаревшее)

  // Количество и цены
  quantity           Decimal           @default(1) @db.Decimal(10, 2)
  unitPrice          Decimal           @map("unit_price") @db.Decimal(10, 2)      // Цена за единицу
  basePrice          Decimal           @map("base_price") @db.Decimal(10, 2)      // Базовая цена без НДС
  vatRate            Decimal           @default(0) @map("vat_rate") @db.Decimal(5, 2)  // Ставка НДС (%)
  vatAmount          Decimal           @default(0) @map("vat_amount") @db.Decimal(10, 2)  // Сумма НДС
  discountPercent    Decimal           @default(0) @map("discount_percent") @db.Decimal(5, 2)
  discountAmount     Decimal           @default(0) @map("discount_amount") @db.Decimal(10, 2)
  totalPrice         Decimal           @map("total_price") @db.Decimal(10, 2)     // Итоговая цена

  // Логика списания
  writeOffTiming     WriteOffTiming    @map("write_off_timing")  // Когда списывать
  writeOffStatus     WriteOffStatus    @default(PENDING) @map("write_off_status")  // Статус списания
  remainingQuantity  Decimal?          @map("remaining_quantity") @db.Decimal(10, 2)  // Остаток (для ON_USE)

  // Корректировка цены
  isPriceAdjusted    Boolean           @default(false) @map("is_price_adjusted")
  adjustmentReason   String?           @map("adjustment_reason") @db.Text

  // Системные поля
  createdAt          DateTime          @default(now()) @map("created_at")
  updatedAt          DateTime          @updatedAt @map("updated_at")

  // Связи
  invoice            Invoice           @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  service            Service?          @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  subscriptionType   SubscriptionType? @relation(fields: [subscriptionTypeId], references: [id], onDelete: SetNull)
  room               Room?             @relation(fields: [roomId], references: [id], onDelete: SetNull)

  @@index([invoiceId])
  @@index([serviceId])
  @@index([writeOffStatus])
  @@map("invoice_items")
}

enum ServiceType {
  SUBSCRIPTION      // Абонемент
  RENTAL            // Аренда
  SINGLE_SESSION    // Разовое занятие
  INDIVIDUAL_LESSON // Индивидуальное занятие
  COWORKING         // Коворкинг
  OTHER             // Прочие услуги
}

enum WriteOffTiming {
  ON_SALE   // Списание при продаже (оплате счета)
  ON_USE    // Списание при использовании
}

enum WriteOffStatus {
  PENDING       // Ожидает списания
  IN_PROGRESS   // Частично списано (для ON_USE)
  COMPLETED     // Полностью списано
  CANCELLED     // Отменено
}
```

### 3. InvoiceAuditLog (Журнал изменений счета)

```prisma
model InvoiceAuditLog {
  id          String   @id @default(uuid())
  invoiceId   String   @map("invoice_id")
  itemId      String?  @map("item_id")  // Если изменение касается конкретной позиции

  // Что изменилось
  action      AuditAction
  fieldName   String   @map("field_name")  // Название поля
  oldValue    String?  @map("old_value")   // Старое значение (JSON)
  newValue    String?  @map("new_value")   // Новое значение (JSON)

  // Причина и автор
  reason      String?  @db.Text
  userId      String   @map("user_id")

  // Системные поля
  createdAt   DateTime @default(now()) @map("created_at")

  // Связи
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id])

  @@index([invoiceId])
  @@index([createdAt])
  @@map("invoice_audit_logs")
}

enum AuditAction {
  CREATED         // Счет создан
  UPDATED         // Обновлен
  PRICE_ADJUSTED  // Цена скорректирована
  STATUS_CHANGED  // Статус изменен
  ITEM_ADDED      // Позиция добавлена
  ITEM_REMOVED    // Позиция удалена
  CANCELLED       // Счет отменен
}
```

### 4. BenefitCategory (Льготная категория)

```prisma
model BenefitCategory {
  id                 String   @id @default(uuid())
  name               String   @unique  // "Многодетная семья", "Инвалид", etc.
  discountPercent    Decimal  @map("discount_percent") @db.Decimal(5, 2)  // Процент скидки
  description        String?  @db.Text
  requiresDocument   Boolean  @default(false) @map("requires_document")  // Требуется подтверждающий документ
  isActive           Boolean  @default(true) @map("is_active")

  // Системные поля
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  // Связи
  clients            Client[]

  @@map("benefit_categories")
}
```

### 5. Изменения в существующих моделях

#### Client (Клиент)

```prisma
model Client {
  // ... существующие поля

  // Добавить:
  benefitCategoryId  String?          @map("benefit_category_id")
  benefitCategory    BenefitCategory? @relation(fields: [benefitCategoryId], references: [id], onDelete: SetNull)

  invoices           Invoice[]
}
```

#### Subscription (Абонемент)

```prisma
model Subscription {
  // ... существующие поля

  // Добавить:
  invoices           Invoice[]
}
```

#### Rental (Аренда)

```prisma
model Rental {
  // ... существующие поля

  // Добавить:
  invoices           Invoice[]
  autoCreateInvoice  Boolean  @default(true) @map("auto_create_invoice")  // Автосоздание счета
}
```

#### Payment (Платеж)

```prisma
model Payment {
  // ... существующие поля

  // Изменить:
  invoiceId   String?  @map("invoice_id")  // Вместо прямых связей с subscription/rental
  invoice     Invoice? @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  // Оставить для обратной совместимости:
  subscriptionId  String?  @map("subscription_id")
  rentalId        String?  @map("rental_id")
}
```

#### SubscriptionType (Тип абонемента / Номенклатура)

```prisma
model SubscriptionType {
  // ... существующие поля

  // Добавить:
  writeOffTiming  WriteOffTiming  @default(ON_USE) @map("write_off_timing")
  invoiceItems    InvoiceItem[]
}
```

#### Room (Помещение)

```prisma
model Room {
  // ... существующие поля

  // Добавить:
  invoiceItems  InvoiceItem[]
}
```

---

## Бизнес-логика

### 1. Создание счета за абонемент

#### 1.1. Новый абонемент (первая покупка)

**Сценарий:** Клиент записывается в группу

```typescript
async function createSubscriptionWithInvoice(data: {
  clientId: string;
  groupId: string;
  subscriptionTypeId: string;
  startDate: Date;
}) {
  // 1. Получить данные
  const client = await getClient(data.clientId);
  const subscriptionType = await getSubscriptionType(data.subscriptionTypeId);

  // 2. Создать абонемент (статус PENDING)
  const subscription = await prisma.subscription.create({
    data: {
      clientId: data.clientId,
      groupId: data.groupId,
      subscriptionTypeId: data.subscriptionTypeId,
      startDate: data.startDate,
      endDate: addMonths(data.startDate, 1),
      status: 'PENDING',
      originalPrice: subscriptionType.price,
      paidPrice: 0,  // Будет установлено после оплаты
    }
  });

  // 3. Рассчитать цену с учетом льгот
  const discount = client.benefitCategory?.discountPercent || 0;
  const basePrice = subscriptionType.price;
  const discountAmount = basePrice * (discount / 100);
  const totalPrice = basePrice - discountAmount;

  // 4. Создать счет
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await generateInvoiceNumber(),
      clientId: data.clientId,
      subscriptionId: subscription.id,
      subtotal: basePrice,
      discountAmount: discountAmount,
      totalAmount: totalPrice,
      status: 'PENDING',
      dueDate: addDays(new Date(), 7),  // 7 дней на оплату
      items: {
        create: [{
          serviceType: 'SUBSCRIPTION',
          serviceName: subscriptionType.name,
          subscriptionTypeId: subscriptionType.id,
          quantity: 1,
          unitPrice: basePrice,
          basePrice: basePrice,
          discountPercent: discount,
          discountAmount: discountAmount,
          totalPrice: totalPrice,
          writeOffTiming: subscriptionType.writeOffTiming,
          writeOffStatus: 'PENDING',
          remainingQuantity: subscriptionType.type === 'MONTHLY' ? null : 1,
        }]
      }
    },
    include: { items: true }
  });

  // 5. Отправить уведомление клиенту
  await sendInvoiceNotification(invoice);

  return { subscription, invoice };
}
```

#### 1.2. Продление абонемента (автоматическое)

**Cron job:** Выполняется ежедневно

```typescript
async function autoRenewSubscriptions() {
  // 1. Найти абонементы, заканчивающиеся через 7 дней
  const expiringSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        gte: addDays(new Date(), 7),
        lte: addDays(new Date(), 8),
      }
    },
    include: {
      client: { include: { benefitCategory: true } },
      subscriptionType: true,
    }
  });

  for (const subscription of expiringSubscriptions) {
    // 2. Проверить, нет ли уже созданного счета на продление
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        subscriptionId: subscription.id,
        status: { in: ['PENDING', 'DRAFT'] },
        issuedAt: { gte: addDays(new Date(), -30) }
      }
    });

    if (existingInvoice) continue;  // Счет уже создан

    // 3. Рассчитать цену
    const discount = subscription.client.benefitCategory?.discountPercent || 0;
    const basePrice = subscription.subscriptionType.price;
    const discountAmount = basePrice * (discount / 100);
    const totalPrice = basePrice - discountAmount;

    // 4. Создать счет на продление
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: await generateInvoiceNumber(),
        clientId: subscription.clientId,
        subscriptionId: subscription.id,
        subtotal: basePrice,
        discountAmount: discountAmount,
        totalAmount: totalPrice,
        status: 'PENDING',
        dueDate: subscription.endDate,  // Оплатить до окончания абонемента
        notes: 'Автоматическое продление абонемента',
        items: {
          create: [{
            serviceType: 'SUBSCRIPTION',
            serviceName: `${subscription.subscriptionType.name} (продление)`,
            subscriptionTypeId: subscription.subscriptionType.id,
            quantity: 1,
            unitPrice: basePrice,
            basePrice: basePrice,
            discountPercent: discount,
            discountAmount: discountAmount,
            totalPrice: totalPrice,
            writeOffTiming: subscription.subscriptionType.writeOffTiming,
            writeOffStatus: 'PENDING',
          }]
        }
      }
    });

    // 5. Отправить уведомление
    await sendRenewalNotification(subscription.client, invoice);
  }
}
```

### 2. Создание счета за аренду

#### 2.1. Автоматическое создание при бронировании

```typescript
async function createRentalWithInvoice(data: {
  roomId: string;
  clientId?: string;  // Может быть внешний клиент
  clientName: string;
  clientPhone: string;
  date: Date;
  startTime: Date;
  endTime: Date;
}) {
  // 1. Получить данные помещения
  const room = await getRoom(data.roomId);

  // 2. Рассчитать стоимость
  const durationHours = differenceInHours(data.endTime, data.startTime);
  const calculatedPrice = room.hourlyRate * durationHours;

  // 3. Применить скидку, если клиент из базы
  let discount = 0;
  let totalPrice = calculatedPrice;

  if (data.clientId) {
    const client = await getClient(data.clientId);
    discount = client.benefitCategory?.discountPercent || 0;
    const discountAmount = calculatedPrice * (discount / 100);
    totalPrice = calculatedPrice - discountAmount;
  }

  // 4. Создать аренду
  const rental = await prisma.rental.create({
    data: {
      roomId: data.roomId,
      clientId: data.clientId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      totalPrice: totalPrice,
      status: 'PLANNED',
    }
  });

  // 5. Создать счет (если autoCreateInvoice = true)
  if (room.autoCreateInvoice !== false) {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: await generateInvoiceNumber(),
        clientId: data.clientId,
        rentalId: rental.id,
        subtotal: calculatedPrice,
        discountAmount: calculatedPrice - totalPrice,
        totalAmount: totalPrice,
        status: 'PENDING',
        dueDate: data.date,  // Оплатить до даты аренды
        items: {
          create: [{
            serviceType: 'RENTAL',
            serviceName: `Аренда ${room.name}`,
            roomId: room.id,
            quantity: durationHours,
            unitPrice: room.hourlyRate,
            basePrice: calculatedPrice,
            discountPercent: discount,
            discountAmount: calculatedPrice - totalPrice,
            totalPrice: totalPrice,
            writeOffTiming: 'ON_SALE',  // Аренда списывается сразу
            writeOffStatus: 'PENDING',
          }]
        }
      }
    });

    return { rental, invoice };
  }

  return { rental, invoice: null };
}
```

#### 2.2. Ручное создание счета менеджером

```typescript
async function createManualInvoiceForRental(
  rentalId: string,
  userId: string
) {
  const rental = await getRental(rentalId);

  // Проверить, нет ли уже счета
  const existingInvoice = await prisma.invoice.findFirst({
    where: { rentalId: rentalId, status: { not: 'CANCELLED' } }
  });

  if (existingInvoice) {
    throw new Error('Счет для этой аренды уже существует');
  }

  // Создать счет аналогично автоматическому
  // ... (код аналогичен пункту 2.1)
}
```

### 3. Ручное создание счета

```typescript
async function createManualInvoice(data: {
  clientId: string;
  items: Array<{
    serviceType: ServiceType;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    writeOffTiming: WriteOffTiming;
  }>;
  notes?: string;
  createdBy: string;
}) {
  // 1. Получить клиента
  const client = await getClient(data.clientId);
  const discount = client.benefitCategory?.discountPercent || 0;

  // 2. Рассчитать суммы для каждой позиции
  const items = data.items.map(item => {
    const basePrice = item.quantity * item.unitPrice;
    const discountAmount = basePrice * (discount / 100);
    const totalPrice = basePrice - discountAmount;

    return {
      serviceType: item.serviceType,
      serviceName: item.serviceName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      basePrice: basePrice,
      discountPercent: discount,
      discountAmount: discountAmount,
      totalPrice: totalPrice,
      writeOffTiming: item.writeOffTiming,
      writeOffStatus: 'PENDING',
      remainingQuantity: item.writeOffTiming === 'ON_USE' ? item.quantity : null,
    };
  });

  // 3. Рассчитать итоговые суммы
  const subtotal = items.reduce((sum, item) => sum + item.basePrice, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // 4. Создать счет
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await generateInvoiceNumber(),
      clientId: data.clientId,
      subtotal: subtotal,
      discountAmount: totalDiscount,
      totalAmount: totalAmount,
      status: 'PENDING',
      notes: data.notes,
      createdBy: data.createdBy,
      items: {
        create: items
      }
    },
    include: { items: true }
  });

  // 5. Логировать создание
  await prisma.invoiceAuditLog.create({
    data: {
      invoiceId: invoice.id,
      action: 'CREATED',
      fieldName: 'invoice',
      newValue: JSON.stringify({ totalAmount: invoice.totalAmount }),
      userId: data.createdBy,
    }
  });

  return invoice;
}
```

### 4. Корректировка цены

```typescript
async function adjustInvoiceItemPrice(
  itemId: string,
  newPrice: number,
  reason: string,
  userId: string
) {
  // 1. Получить позицию
  const item = await prisma.invoiceItem.findUnique({
    where: { id: itemId },
    include: { invoice: true }
  });

  if (!item) throw new Error('Позиция не найдена');
  if (item.invoice.status !== 'DRAFT' && item.invoice.status !== 'PENDING') {
    throw new Error('Нельзя изменить цену в оплаченном счете');
  }

  if (!reason || reason.trim().length < 10) {
    throw new Error('Необходимо указать причину корректировки (минимум 10 символов)');
  }

  const oldPrice = item.totalPrice;

  // 2. Обновить позицию
  const updatedItem = await prisma.invoiceItem.update({
    where: { id: itemId },
    data: {
      totalPrice: newPrice,
      isPriceAdjusted: true,
      adjustmentReason: reason,
    }
  });

  // 3. Пересчитать итоговую сумму счета
  const allItems = await prisma.invoiceItem.findMany({
    where: { invoiceId: item.invoiceId }
  });

  const newTotalAmount = allItems.reduce(
    (sum, i) => sum + (i.id === itemId ? newPrice : i.totalPrice),
    0
  );

  await prisma.invoice.update({
    where: { id: item.invoiceId },
    data: { totalAmount: newTotalAmount }
  });

  // 4. Логировать изменение
  await prisma.invoiceAuditLog.create({
    data: {
      invoiceId: item.invoiceId,
      itemId: itemId,
      action: 'PRICE_ADJUSTED',
      fieldName: 'totalPrice',
      oldValue: oldPrice.toString(),
      newValue: newPrice.toString(),
      reason: reason,
      userId: userId,
    }
  });

  return updatedItem;
}
```

### 5. Оплата счета

```typescript
async function processInvoicePayment(
  invoiceId: string,
  paymentData: {
    amount: number;
    method: PaymentMethod;
    userId: string;
  }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
      subscription: true,
      rental: true,
    }
  });

  if (!invoice) throw new Error('Счет не найден');
  if (invoice.status === 'PAID') throw new Error('Счет уже оплачен');

  // 1. Создать платеж
  const payment = await prisma.payment.create({
    data: {
      clientId: invoice.clientId,
      invoiceId: invoice.id,
      amount: paymentData.amount,
      paymentMethod: paymentData.method,
      paymentType: invoice.subscriptionId ? 'SUBSCRIPTION' : 'RENTAL',
      status: 'COMPLETED',
      paidAt: new Date(),
    }
  });

  // 2. Определить статус оплаты
  const totalPaid = await getTotalPaidForInvoice(invoiceId);
  let newStatus: InvoiceStatus;

  if (totalPaid >= invoice.totalAmount) {
    newStatus = 'PAID';
  } else {
    newStatus = 'PARTIALLY_PAID';
  }

  // 3. Обновить статус счета
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date() : null,
    }
  });

  // 4. Обработать списание услуг с ON_SALE
  if (newStatus === 'PAID') {
    await processWriteOffOnSale(invoice);

    // 5. Активировать абонемент, если это первая покупка
    if (invoice.subscription && invoice.subscription.status === 'PENDING') {
      await prisma.subscription.update({
        where: { id: invoice.subscription.id },
        data: {
          status: 'ACTIVE',
          paidPrice: invoice.totalAmount,
        }
      });
    }

    // 6. Продлить абонемент, если это продление
    if (invoice.subscription && invoice.subscription.status === 'ACTIVE') {
      await prisma.subscription.update({
        where: { id: invoice.subscription.id },
        data: {
          endDate: addMonths(invoice.subscription.endDate, 1),
        }
      });
    }

    // 7. Подтвердить аренду
    if (invoice.rental) {
      await prisma.rental.update({
        where: { id: invoice.rental.id },
        data: { status: 'CONFIRMED' }
      });
    }
  }

  // 8. Логировать оплату
  await prisma.invoiceAuditLog.create({
    data: {
      invoiceId: invoice.id,
      action: 'STATUS_CHANGED',
      fieldName: 'status',
      oldValue: invoice.status,
      newValue: newStatus,
      userId: paymentData.userId,
    }
  });

  return { payment, invoice };
}
```

### 6. Списание услуг

#### 6.1. Списание при продаже (ON_SALE)

```typescript
async function processWriteOffOnSale(invoice: Invoice) {
  // Найти все позиции с ON_SALE
  const items = await prisma.invoiceItem.findMany({
    where: {
      invoiceId: invoice.id,
      writeOffTiming: 'ON_SALE',
      writeOffStatus: 'PENDING',
    }
  });

  // Списать все сразу
  for (const item of items) {
    await prisma.invoiceItem.update({
      where: { id: item.id },
      data: {
        writeOffStatus: 'COMPLETED',
        remainingQuantity: 0,
      }
    });
  }
}
```

#### 6.2. Списание при использовании (ON_USE)

```typescript
async function writeOffOnUse(
  itemId: string,
  quantityUsed: number,
  usageDetails: {
    date: Date;
    attendanceId?: string;  // Если списание за посещение
    notes?: string;
  }
) {
  const item = await prisma.invoiceItem.findUnique({
    where: { id: itemId },
    include: { invoice: true }
  });

  if (!item) throw new Error('Позиция не найдена');
  if (item.invoice.status !== 'PAID') {
    throw new Error('Нельзя списать неоплаченную услугу');
  }
  if (item.writeOffTiming !== 'ON_USE') {
    throw new Error('Эта услуга списывается при продаже');
  }

  const remaining = item.remainingQuantity || 0;

  if (remaining < quantityUsed) {
    throw new Error(`Недостаточно остатка. Доступно: ${remaining}`);
  }

  const newRemaining = remaining - quantityUsed;

  // Обновить остаток
  await prisma.invoiceItem.update({
    where: { id: itemId },
    data: {
      remainingQuantity: newRemaining,
      writeOffStatus: newRemaining === 0 ? 'COMPLETED' : 'IN_PROGRESS',
    }
  });

  // Можно создать отдельную таблицу WriteOffLog для детального учета
  // await createWriteOffLog({ itemId, quantityUsed, ...usageDetails });

  return newRemaining;
}
```

**Пример использования при посещении:**

```typescript
// В модуле посещаемости (Attendance)
async function markAttendance(
  clientId: string,
  scheduleId: string,
  date: Date
) {
  // 1. Создать запись посещения
  const attendance = await prisma.attendance.create({
    data: {
      clientId,
      scheduleId,
      date,
      status: 'PRESENT',
    }
  });

  // 2. Найти активный абонемент клиента для этой группы
  const subscription = await findActiveSubscription(clientId, scheduleId);

  if (subscription) {
    // 3. Найти неоплаченную позицию счета с ON_USE
    const invoiceItem = await prisma.invoiceItem.findFirst({
      where: {
        invoice: {
          subscriptionId: subscription.id,
          status: 'PAID',
        },
        writeOffTiming: 'ON_USE',
        writeOffStatus: { in: ['PENDING', 'IN_PROGRESS'] },
        remainingQuantity: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' }  // Списываем старые первыми
    });

    if (invoiceItem) {
      // 4. Списать 1 занятие
      await writeOffOnUse(invoiceItem.id, 1, {
        date,
        attendanceId: attendance.id,
        notes: 'Посещение занятия'
      });
    }
  }

  return attendance;
}
```

### 7. Отмена счета

```typescript
async function cancelInvoice(
  invoiceId: string,
  reason: string,
  userId: string
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });

  if (!invoice) throw new Error('Счет не найден');
  if (invoice.status === 'PAID') {
    throw new Error('Нельзя отменить оплаченный счет. Необходим возврат.');
  }

  // Отменить счет
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'CANCELLED' }
  });

  // Логировать
  await prisma.invoiceAuditLog.create({
    data: {
      invoiceId,
      action: 'CANCELLED',
      fieldName: 'status',
      oldValue: invoice.status,
      newValue: 'CANCELLED',
      reason,
      userId,
    }
  });
}
```

---

## API Endpoints

### 1. Счета (Invoices)

#### GET /api/invoices

Получить список счетов с фильтрацией

**Query параметры:**
- `clientId` — фильтр по клиенту
- `status` — фильтр по статусу
- `fromDate`, `toDate` — период
- `page`, `limit` — пагинация

**Response:**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2025-00001",
      "client": {
        "id": "uuid",
        "firstName": "Иван",
        "lastName": "Иванов",
        "benefitCategory": {
          "name": "Многодетная семья",
          "discountPercent": 30
        }
      },
      "subtotal": 5000.00,
      "discountAmount": 1500.00,
      "totalAmount": 3500.00,
      "status": "PENDING",
      "issuedAt": "2025-01-15T10:00:00Z",
      "dueDate": "2025-01-22",
      "items": [
        {
          "serviceName": "Абонемент на 1 месяц - Танцы",
          "quantity": 1,
          "unitPrice": 5000.00,
          "totalPrice": 3500.00
        }
      ]
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

#### GET /api/invoices/:id

Получить детали счета

**Response:**
```json
{
  "id": "uuid",
  "invoiceNumber": "INV-2025-00001",
  "client": { /* ... */ },
  "subscription": { /* ... */ },
  "rental": null,
  "subtotal": 5000.00,
  "discountAmount": 1500.00,
  "totalAmount": 3500.00,
  "status": "PENDING",
  "issuedAt": "2025-01-15T10:00:00Z",
  "dueDate": "2025-01-22",
  "paidAt": null,
  "notes": null,
  "items": [
    {
      "id": "uuid",
      "serviceType": "SUBSCRIPTION",
      "serviceName": "Абонемент на 1 месяц - Танцы",
      "quantity": 1,
      "unitPrice": 5000.00,
      "basePrice": 5000.00,
      "discountPercent": 30,
      "discountAmount": 1500.00,
      "totalPrice": 3500.00,
      "writeOffTiming": "ON_USE",
      "writeOffStatus": "PENDING",
      "remainingQuantity": 12,
      "isPriceAdjusted": false
    }
  ],
  "payments": [],
  "auditLogs": []
}
```

#### POST /api/invoices

Создать счет вручную

**Request:**
```json
{
  "clientId": "uuid",
  "items": [
    {
      "serviceType": "SUBSCRIPTION",
      "serviceName": "Абонемент танцы",
      "subscriptionTypeId": "uuid",
      "quantity": 1,
      "unitPrice": 5000.00,
      "writeOffTiming": "ON_USE"
    }
  ],
  "notes": "Ручное создание счета",
  "dueDate": "2025-01-30"
}
```

**Response:** `201 Created` + данные созданного счета

#### POST /api/invoices/from-subscription

Создать счет из абонемента

**Request:**
```json
{
  "subscriptionId": "uuid"
}
```

#### POST /api/invoices/from-rental

Создать счет из аренды

**Request:**
```json
{
  "rentalId": "uuid"
}
```

#### PATCH /api/invoices/:id/items/:itemId/adjust-price

Скорректировать цену позиции

**Request:**
```json
{
  "newPrice": 4000.00,
  "reason": "Индивидуальная скидка по согласованию с директором"
}
```

**Response:** Обновленная позиция + запись в audit log

#### POST /api/invoices/:id/cancel

Отменить счет

**Request:**
```json
{
  "reason": "Клиент отказался от услуги"
}
```

#### GET /api/invoices/:id/audit-log

Получить историю изменений счета

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "CREATED",
      "fieldName": "invoice",
      "oldValue": null,
      "newValue": "{\"totalAmount\": 3500}",
      "reason": null,
      "user": {
        "firstName": "Мария",
        "lastName": "Менеджер"
      },
      "createdAt": "2025-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "action": "PRICE_ADJUSTED",
      "fieldName": "totalPrice",
      "oldValue": "3500.00",
      "newValue": "3000.00",
      "reason": "Индивидуальная скидка",
      "user": { /* ... */ },
      "createdAt": "2025-01-15T11:30:00Z"
    }
  ]
}
```

### 2. Льготные категории (Benefit Categories)

#### GET /api/benefit-categories

Получить список льготных категорий

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Многодетная семья",
      "discountPercent": 30,
      "description": "Семьи с 3 и более детьми",
      "requiresDocument": true,
      "isActive": true
    }
  ]
}
```

#### POST /api/benefit-categories

Создать льготную категорию

**Request:**
```json
{
  "name": "Многодетная семья",
  "discountPercent": 30,
  "description": "Семьи с 3 и более детьми",
  "requiresDocument": true
}
```

#### PATCH /api/benefit-categories/:id

Обновить льготную категорию

#### DELETE /api/benefit-categories/:id

Удалить/деактивировать льготную категорию

### 3. Интеграция с платежами

#### POST /api/payments

Создать платеж (связанный со счетом)

**Request:**
```json
{
  "invoiceId": "uuid",
  "amount": 3500.00,
  "paymentMethod": "CASH"
}
```

Автоматически:
- Создается платеж
- Обновляется статус счета
- Списываются услуги с ON_SALE
- Активируется/продлевается абонемент

---

## Интеграция с другими модулями

### 1. Интеграция с модулем номенклатуры услуг ⭐ **НОВОЕ**

**Файл:** `modules/07_SERVICES_MODULE.md`

**Назначение:**
Модуль номенклатуры (Service) является центральным справочником всех услуг центра. При создании позиций счета (InvoiceItem) данные копируются из справочника услуг.

**Точки интеграции:**

1. **Выбор услуги из справочника** → создание InvoiceItem
2. **Автоматическое применение НДС** из настроек услуги
3. **Автоматическое применение модели списания** (ON_SALE / ON_USE)
4. **Копирование цен и характеристик** на момент создания счета

**Модель связи:**

```typescript
// InvoiceItem копирует данные из Service при создании
model InvoiceItem {
  serviceId          String?      // Ссылка на Service (для истории)

  // Копии данных из Service (на момент создания счета)
  serviceName        String       // Из Service.name
  serviceDescription String?      // Из Service.description
  serviceType        ServiceType  // Из Service.serviceType
  unitPrice          Decimal      // Из Service.priceWithVat
  basePrice          Decimal      // Из Service.basePrice
  vatRate            Decimal      // Из Service.vatRate
  writeOffTiming     WriteOffTiming  // Из Service.writeOffTiming
}
```

**Процесс создания позиции счета из услуги:**

```typescript
async function addServiceToInvoice(invoiceId: string, serviceId: string, quantity: number) {
  // 1. Получаем услугу из справочника
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { category: true }
  });

  // 2. Получаем клиента и его льготную категорию
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: {
        include: { benefitCategory: true }
      }
    }
  });

  // 3. Рассчитываем цены с учетом НДС
  const basePrice = service.basePrice;
  const vatRate = service.vatRate;
  const vatAmount = basePrice * (vatRate / 100);
  const unitPrice = service.priceWithVat;

  // 4. Применяем льготы (если есть)
  const benefitPercent = invoice.client.benefitCategory?.discountPercent || 0;
  const discountAmount = unitPrice * quantity * (benefitPercent / 100);
  const totalPrice = (unitPrice * quantity) - discountAmount;

  // 5. Создаем позицию счета (копируем данные из Service)
  const invoiceItem = await prisma.invoiceItem.create({
    data: {
      invoiceId,
      serviceId: service.id,  // Сохраняем ссылку

      // Копируем данные из Service
      serviceName: service.name,
      serviceDescription: service.description,
      serviceType: service.serviceType,

      // Цены
      quantity,
      unitPrice,
      basePrice: basePrice * quantity,
      vatRate,
      vatAmount: vatAmount * quantity,
      discountPercent: benefitPercent,
      discountAmount,
      totalPrice,

      // Модель списания
      writeOffTiming: service.writeOffTiming,
      remainingQuantity: service.writeOffTiming === 'ON_USE' ? quantity : 0,
    }
  });

  return invoiceItem;
}
```

**Важно:**
- InvoiceItem хранит **копию** данных из Service на момент создания счета
- Изменение цены услуги в справочнике **не влияет** на уже выставленные счета
- Ссылка `serviceId` используется только для истории и аналитики

---

### 2. Интеграция с модулем абонементов

**Файл:** `modules/04_SUBSCRIPTIONS_MODULE.md`

**Точки интеграции:**

1. **Создание абонемента** → автосоздание счета
2. **Продление абонемента** → автосоздание счета (cron job)
3. **Оплата счета** → активация/продление абонемента
4. **Отмена абонемента** → отмена счета

**Изменения в Subscription:**

```typescript
// Новые поля
invoices: Invoice[]  // Связь с счетами

// Новые методы
async function getUnpaidInvoicesForSubscription(subscriptionId: string) {
  return prisma.invoice.findMany({
    where: {
      subscriptionId,
      status: { in: ['PENDING', 'DRAFT', 'OVERDUE'] }
    }
  });
}
```

### 2. Интеграция с модулем аренды

**Файл:** `modules/02_SCHEDULE_MODULE.md`

**Точки интеграции:**

1. **Создание аренды** → опционально создание счета
2. **Подтверждение аренды** → создание счета менеджером
3. **Оплата счета** → подтверждение аренды

**Изменения в Rental:**

```typescript
// Новые поля
invoices: Invoice[]
autoCreateInvoice: boolean  // Флаг автосоздания

// При создании аренды
if (autoCreateInvoice) {
  await createInvoiceFromRental(rental.id);
}
```

### 3. Интеграция с модулем посещаемости

**Файл:** `modules/03_ATTENDANCE_MODULE.md` (если существует)

**Точки интеграции:**

1. **Отметка посещения** → списание 1 занятия из InvoiceItem (ON_USE)
2. **Компенсация пропуска** → создание компенсации (будущее развитие)

**Код:**

```typescript
// В Attendance модуле
async function markAttendance(clientId, scheduleId, date) {
  const attendance = await createAttendance(...);

  // Списать занятие
  await invoicesService.writeOffAttendance(clientId, scheduleId, attendance.id);

  return attendance;
}
```

### 4. Интеграция с модулем клиентов

**Точки интеграции:**

1. **Карточка клиента** → отображение всех счетов клиента
2. **Присвоение льготной категории** → автоматическое применение скидок в новых счетах

**Новые endpoints в Clients:**

```typescript
GET /api/clients/:id/invoices  // Все счета клиента
GET /api/clients/:id/invoices/unpaid  // Неоплаченные счета
```

### 5. Интеграция с модулем платежей

**Связь:**
- Платеж ссылается на Invoice через `invoiceId`
- При создании платежа автоматически обновляется статус счета

**Изменения в Payment:**

```typescript
// Добавить поле
invoiceId: string

// При создании платежа
const payment = await createPayment({
  invoiceId: invoice.id,
  // ...
});

// Автоматически вызвать
await invoicesService.processInvoicePayment(invoice.id, payment);
```

---

## Примеры использования

### Сценарий 1: Продажа абонемента с льготой

**Шаг 1:** Клиент записывается в группу

```http
POST /api/subscriptions
{
  "clientId": "uuid-client-1",
  "groupId": "uuid-group-1",
  "subscriptionTypeId": "uuid-type-1"
}
```

**Автоматически происходит:**

1. Создается `Subscription` (status: PENDING)
2. Проверяется `Client.benefitCategory` (например, "Многодетная семья" — 30%)
3. Создается `Invoice`:
   - `subtotal`: 5000 руб
   - `discountAmount`: 1500 руб (30%)
   - `totalAmount`: 3500 руб
   - `status`: PENDING
4. Создается `InvoiceItem`:
   - `writeOffTiming`: ON_USE
   - `remainingQuantity`: 12 (занятий в месяц)

**Шаг 2:** Клиент оплачивает

```http
POST /api/payments
{
  "invoiceId": "uuid-invoice",
  "amount": 3500.00,
  "paymentMethod": "CASH"
}
```

**Автоматически происходит:**

1. Создается `Payment` (status: COMPLETED)
2. `Invoice.status`: PENDING → PAID
3. `Subscription.status`: PENDING → ACTIVE
4. Если `writeOffTiming` = ON_SALE, услуга списывается

**Шаг 3:** Клиент посещает занятия

```http
POST /api/attendance
{
  "clientId": "uuid-client-1",
  "scheduleId": "uuid-schedule",
  "date": "2025-01-20"
}
```

**Автоматически происходит:**

1. Создается `Attendance` (status: PRESENT)
2. Находится `InvoiceItem` с `writeOffTiming` = ON_USE
3. `remainingQuantity`: 12 → 11
4. `writeOffStatus`: PENDING → IN_PROGRESS

### Сценарий 2: Продление абонемента

**Контекст:**
- Абонемент активен с 01.01.2025 по 31.01.2025
- Сегодня 24.01.2025 (за 7 дней до окончания)

**Cron job выполняет:**

```typescript
await autoRenewSubscriptions();
```

**Автоматически происходит:**

1. Создается новый `Invoice` на продление
2. Отправляется email/SMS клиенту: "Ваш абонемент заканчивается 31.01. Счет на продление: INV-2025-00123"
3. Клиент оплачивает до 31.01
4. При оплате: `Subscription.endDate`: 31.01 → 28.02

**Если не оплачен до 14.02:**

Cron job отчисляет:

```typescript
await processOverdueSubscriptions();
// Subscription.status: ACTIVE → EXPIRED
// GroupMember.status: ACTIVE → EXPELLED
```

### Сценарий 3: Аренда помещения внешним клиентом

**Шаг 1:** Менеджер создает бронирование

```http
POST /api/rentals
{
  "roomId": "uuid-room-1",
  "clientName": "ООО Ромашка",
  "clientPhone": "+7 900 123-45-67",
  "date": "2025-02-15",
  "startTime": "14:00",
  "endTime": "18:00",
  "eventType": "Корпоратив"
}
```

**Автоматически происходит:**

1. Создается `Rental`
2. Рассчитывается стоимость: 4 часа × 2000 руб/час = 8000 руб
3. Если `autoCreateInvoice` = true, создается `Invoice`
4. `InvoiceItem`:
   - `serviceType`: RENTAL
   - `writeOffTiming`: ON_SALE

**Шаг 2:** Клиент оплачивает

```http
POST /api/payments
{
  "invoiceId": "uuid-invoice",
  "amount": 8000.00,
  "paymentMethod": "BANK_TRANSFER"
}
```

**Автоматически:**
- `Rental.status`: PLANNED → CONFIRMED
- `InvoiceItem.writeOffStatus`: PENDING → COMPLETED

### Сценарий 4: Корректировка цены

**Контекст:** Клиенту нужна индивидуальная скидка

**Менеджер корректирует:**

```http
PATCH /api/invoices/uuid-invoice/items/uuid-item/adjust-price
{
  "newPrice": 3000.00,
  "reason": "Индивидуальная скидка для постоянного клиента по согласованию с директором"
}
```

**Автоматически происходит:**

1. `InvoiceItem.totalPrice`: 3500 → 3000
2. `InvoiceItem.isPriceAdjusted`: true
3. `InvoiceItem.adjustmentReason`: сохраняется
4. `Invoice.totalAmount`: пересчитывается
5. Создается `InvoiceAuditLog`:
   - `action`: PRICE_ADJUSTED
   - `oldValue`: "3500.00"
   - `newValue`: "3000.00"
   - `reason`: текст причины
   - `userId`: менеджер

**Просмотр истории:**

```http
GET /api/invoices/uuid-invoice/audit-log
```

**Response:** Полная история всех изменений с указанием кто, когда и почему

### Сценарий 5: Коворкинг на 5 дней

**Шаг 1:** Создание счета

```http
POST /api/invoices
{
  "clientId": "uuid-client",
  "items": [{
    "serviceType": "COWORKING",
    "serviceName": "Коворкинг (5 дней)",
    "quantity": 5,
    "unitPrice": 500.00,
    "writeOffTiming": "ON_USE"
  }]
}
```

**Создается:**
- `InvoiceItem`:
  - `totalPrice`: 2500 руб
  - `writeOffTiming`: ON_USE
  - `remainingQuantity`: 5

**Шаг 2:** Клиент оплачивает

```http
POST /api/payments
{
  "invoiceId": "uuid-invoice",
  "amount": 2500.00,
  "paymentMethod": "ONLINE"
}
```

**Шаг 3:** Каждый день при посещении

```http
POST /api/coworking/check-in
{
  "clientId": "uuid-client",
  "date": "2025-02-01"
}
```

**Внутри метода:**

```typescript
// Списать 1 день
await invoicesService.writeOffOnUse(itemId, 1, {
  date: new Date(),
  notes: 'Посещение коворкинга'
});
```

**После 5 посещений:**
- `remainingQuantity`: 5 → 4 → 3 → 2 → 1 → 0
- `writeOffStatus`: PENDING → IN_PROGRESS → COMPLETED

---

## Обработка особых случаев

### 1. Частичная оплата счета

**Сценарий:** Клиент оплатил только часть суммы

```http
POST /api/payments
{
  "invoiceId": "uuid-invoice",
  "amount": 2000.00  // Из 3500 руб
}
```

**Обработка:**

```typescript
const totalPaid = await getTotalPaidForInvoice(invoiceId);  // 2000
const invoice = await getInvoice(invoiceId);  // totalAmount: 3500

if (totalPaid >= invoice.totalAmount) {
  invoice.status = 'PAID';
} else {
  invoice.status = 'PARTIALLY_PAID';
}
```

**Поведение:**
- Абонемент НЕ активируется до полной оплаты
- Клиент может доплатить позже
- При полной оплате — активация

### 2. Просроченный счет

**Cron job:** Ежедневно

```typescript
async function markOverdueInvoices() {
  const today = new Date();

  await prisma.invoice.updateMany({
    where: {
      status: 'PENDING',
      dueDate: { lt: today }
    },
    data: { status: 'OVERDUE' }
  });
}
```

**Уведомления:**
- Email/SMS клиенту: "Срок оплаты истек"
- Уведомление менеджеру

### 3. Отмена оплаченного счета (возврат)

**Сценарий:** Клиент отказался от услуги после оплаты

**Процесс:**

1. Нельзя просто отменить счет:
```typescript
if (invoice.status === 'PAID') {
  throw new Error('Для отмены оплаченного счета необходимо оформить возврат');
}
```

2. Необходимо создать возврат (Refund) — отдельный модуль

3. После возврата:
   - Счет остается PAID
   - Создается связь Invoice → Refund
   - Абонемент отменяется

### 4. Несколько абонементов у одного клиента

**Сценарий:** Клиент ходит в 2 группы (танцы + вокал)

**Обработка:**

```typescript
// У клиента 2 активных абонемента
const subscriptions = await prisma.subscription.findMany({
  where: {
    clientId: 'uuid-client',
    status: 'ACTIVE'
  }
});
// subscriptions.length = 2

// Для каждого абонемента свой счет
subscription1 → invoice1
subscription2 → invoice2

// При посещении танцев списывается из invoice1
// При посещении вокала списывается из invoice2
```

### 5. Изменение льготной категории клиента

**Сценарий:** Клиенту присвоена льготная категория после создания счета

**Поведение:**

1. **Существующие счета** (PENDING) — НЕ пересчитываются автоматически
2. Менеджер может вручную скорректировать цену:
   ```http
   PATCH /api/invoices/:id/items/:itemId/adjust-price
   {
     "newPrice": 3500.00,  // С учетом новой льготы
     "reason": "Применена льготная категория 'Многодетная семья'"
   }
   ```
3. **Новые счета** — создаются с учетом льготы автоматически

### 6. Удаление льготной категории

**Сценарий:** Льготная категория удаляется/деактивируется

**Обработка:**

```typescript
// Soft delete — isActive = false
await prisma.benefitCategory.update({
  where: { id: categoryId },
  data: { isActive: false }
});

// Клиенты с этой категорией
const clients = await prisma.client.findMany({
  where: { benefitCategoryId: categoryId }
});

// Можно:
// 1. Обнулить benefitCategoryId у клиентов
// 2. Или оставить (льгота сохраняется для текущих клиентов)
```

### 7. Списание при отсутствии остатка

**Сценарий:** Попытка списать занятие, но остаток = 0

```typescript
async function writeOffOnUse(itemId, quantityUsed) {
  const item = await getInvoiceItem(itemId);

  if (item.remainingQuantity === 0) {
    throw new Error('Абонемент закончился. Необходимо продление.');
  }

  if (item.remainingQuantity < quantityUsed) {
    throw new Error(`Недостаточно занятий. Доступно: ${item.remainingQuantity}`);
  }

  // Списать
}
```

**Уведомление:**
- "У вас закончился абонемент. Пожалуйста, продлите."

### 8. Комбинированный счет (несколько услуг)

**Сценарий:** Клиент покупает абонемент + разовое занятие в другой студии

```http
POST /api/invoices
{
  "clientId": "uuid-client",
  "items": [
    {
      "serviceType": "SUBSCRIPTION",
      "serviceName": "Абонемент Танцы",
      "subscriptionTypeId": "uuid-1",
      "quantity": 1,
      "unitPrice": 5000.00,
      "writeOffTiming": "ON_USE"
    },
    {
      "serviceType": "SINGLE_SESSION",
      "serviceName": "Пробное занятие Вокал",
      "subscriptionTypeId": "uuid-2",
      "quantity": 1,
      "unitPrice": 500.00,
      "writeOffTiming": "ON_SALE"
    }
  ]
}
```

**Итог:**
- Один счет на 5500 руб (с учетом льготы на обе позиции)
- При оплате:
  - Абонемент активируется (ON_USE, будет списываться по посещениям)
  - Разовое занятие списывается сразу (ON_SALE)

### 9. Миграция старых данных

**Сценарий:** В системе уже есть активные абонементы без счетов

**Процесс:**

```typescript
async function migrateExistingSubscriptions() {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      invoices: { none: {} }  // Нет связанных счетов
    }
  });

  for (const sub of subscriptions) {
    // Создать "исторический" счет
    await prisma.invoice.create({
      data: {
        invoiceNumber: await generateInvoiceNumber(),
        clientId: sub.clientId,
        subscriptionId: sub.id,
        subtotal: sub.originalPrice,
        discountAmount: sub.originalPrice - sub.paidPrice,
        totalAmount: sub.paidPrice,
        status: 'PAID',  // Уже оплачен
        issuedAt: sub.purchaseDate,
        paidAt: sub.purchaseDate,
        notes: 'Миграция существующего абонемента',
        items: {
          create: [{
            serviceType: 'SUBSCRIPTION',
            serviceName: 'Абонемент (мигрировано)',
            quantity: 1,
            unitPrice: sub.originalPrice,
            basePrice: sub.originalPrice,
            totalPrice: sub.paidPrice,
            writeOffTiming: 'ON_USE',
            writeOffStatus: 'IN_PROGRESS',
            remainingQuantity: sub.remainingVisits || 0,
          }]
        }
      }
    });
  }
}
```

---

## Итоги

### Ключевые преимущества модуля счетов:

1. **Единый учет** всех финансовых взаиморасчетов
2. **Гибкая логика списания** (при продаже / при использовании)
3. **Автоматизация** создания счетов и продлений
4. **Прозрачность** — полный аудит всех изменений
5. **Поддержка льгот** — автоматическое применение скидок
6. **Интеграция** со всеми модулями системы

### Что дальше:

1. **Реализация моделей** в Prisma Schema
2. **Миграция БД** и seed данных
3. **Backend API** (NestJS модули, сервисы, контроллеры)
4. **Frontend** (страницы счетов, форма оплаты)
5. **Интеграция с ЮКасса** для онлайн-оплаты
6. **Email/SMS уведомления** о счетах
7. **Отчеты** по финансам
