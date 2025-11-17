# Модуль 7: Платежи (Payments)

**Версия:** 1.0
**Дата создания:** 2025-11-17
**Статус:** ✅ Реализован на 90%
**Связанные модули:** [Счета](./05_INVOICES_MODULE.md), [Клиенты](./01_CLIENTS_CRM_MODULE.md), [Абонементы](./06_SUBSCRIPTIONS_MODULE.md)

---

## 📋 Обзор модуля

Модуль платежей обеспечивает управление всеми денежными операциями в системе с автоматическим обновлением статусов счетов, валидацией сумм и поддержкой различных методов оплаты.

### Основные возможности

- ✅ **Создание платежей** с привязкой к счетам
- ✅ **Автоматическое обновление статуса счетов** (PAID/PARTIALLY_PAID/PENDING)
- ✅ **Валидация сумм** (платеж не превышает непогашенную сумму счета)
- ✅ **Множественные методы оплаты** (Наличные, Карта, Онлайн)
- ✅ **Типы платежей** (Абонемент, Аренда, Разовое посещение)
- ✅ **Статусы платежей** (Ожидание, Завершен, Неудача, Возврат)
- ✅ **История платежей** по клиентам и счетам
- ✅ **Фильтрация и пагинация** платежей
- ✅ **Расчет остатка к оплате** для счетов
- ⚠️ **Детальный просмотр платежа** (в разработке)
- ⚠️ **Расширенные фильтры** в UI (API поддерживает)

---

## 🗄️ Структура БД

### Модель: Payment

**Файл:** `backend/prisma/schema.prisma` (строки 372-397)

```prisma
model Payment {
  id             String        @id @default(uuid())
  clientId       String        @map("client_id")
  amount         Decimal       @db.Decimal(10, 2)
  paymentMethod  PaymentMethod @map("payment_method")
  paymentType    PaymentType   @map("payment_type")
  status         PaymentStatus @default(PENDING)
  transactionId  String?       @map("transaction_id")
  subscriptionId String?       @map("subscription_id")
  rentalId       String?       @map("rental_id")
  invoiceId      String?       @map("invoice_id")
  notes          String?
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  // Relations
  client         Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  invoice        Invoice?      @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  rental         Rental?       @relation(fields: [rentalId], references: [id], onDelete: SetNull)
  subscription   Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)

  // Indexes для производительности
  @@index([clientId])
  @@index([invoiceId])
  @@index([status])
  @@index([createdAt])
  @@index([paymentType])
  @@map("payments")
}
```

### Enums

```prisma
enum PaymentMethod {
  CASH   // Наличные
  CARD   // Банковская карта (терминал)
  ONLINE // Онлайн-платеж
}

enum PaymentType {
  SUBSCRIPTION // Оплата абонемента
  RENTAL       // Оплата аренды
  SINGLE_VISIT // Разовое посещение
}

enum PaymentStatus {
  PENDING   // Ожидание обработки
  COMPLETED // Завершен успешно
  FAILED    // Неудача
  REFUNDED  // Возврат средств
}
```

### Связи

- **Client** (Many-to-One): Клиент, совершивший платеж
- **Invoice** (Many-to-One): Счет, к которому привязан платеж
- **Subscription** (Many-to-One, optional): Абонемент (для backward compatibility)
- **Rental** (Many-to-One, optional): Аренда (для backward compatibility)

---

## 🔌 Backend API

### Структура модуля

**Файлы:**
```
backend/src/payments/
├── payments.module.ts          (12 строк)
├── payments.controller.ts      (54 строки)
├── payments.service.ts         (335 строк)
└── dto/
    ├── create-payment.dto.ts   (50 строк)
    ├── update-payment.dto.ts   (16 строк)
    └── payment-filter.dto.ts   (53 строки)
```

**Всего:** 518 строк кода

### Endpoints

#### 1. POST /payments
**Создание платежа**

**Guards:** `JwtAuthGuard`
**Body:** `CreatePaymentDto`

**Пример запроса:**
```typescript
{
  "clientId": "uuid",
  "invoiceId": "uuid",
  "amount": 5000.00,
  "paymentMethod": "CASH",
  "paymentType": "SUBSCRIPTION",
  "subscriptionId": "uuid", // optional
  "notes": "Оплата за абонемент на январь"
}
```

**Бизнес-логика:**
1. Проверка существования клиента
2. Проверка существования счета и его статуса
3. Валидация суммы (не превышает непогашенную сумму счета)
4. Для CASH - автоматическая установка статуса COMPLETED
5. Создание платежа с include всех relations
6. **Автоматическое обновление статуса счета** (PAID/PARTIALLY_PAID)

**Ответ:**
```typescript
{
  "id": "uuid",
  "clientId": "uuid",
  "invoiceId": "uuid",
  "amount": 5000.00,
  "paymentMethod": "CASH",
  "paymentType": "SUBSCRIPTION",
  "status": "COMPLETED",
  "createdAt": "2025-11-17T10:00:00Z",
  "updatedAt": "2025-11-17T10:00:00Z",
  "client": { ... },
  "invoice": { ... },
  "subscription": { ... }
}
```

#### 2. GET /payments
**Получение списка платежей с фильтрацией и пагинацией**

**Guards:** `JwtAuthGuard`
**Query Parameters:** `PaymentFilterDto`

**Фильтры:**
- `clientId`: UUID клиента
- `invoiceId`: UUID счета
- `subscriptionId`: UUID абонемента
- `rentalId`: UUID аренды
- `paymentMethod`: CASH | CARD | ONLINE
- `paymentType`: SUBSCRIPTION | RENTAL | SINGLE_VISIT
- `status`: PENDING | COMPLETED | FAILED | REFUNDED
- `dateFrom`: ISO date (начало периода)
- `dateTo`: ISO date (конец периода)
- `page`: номер страницы (default: 1)
- `limit`: количество записей (default: 10)

**Пример запроса:**
```
GET /payments?status=COMPLETED&page=1&limit=20
```

**Ответ:**
```typescript
{
  "data": [
    {
      "id": "uuid",
      "amount": 5000.00,
      "paymentMethod": "CASH",
      "status": "COMPLETED",
      "client": { "id": "...", "firstName": "...", "lastName": "..." },
      "invoice": { "id": "...", "invoiceNumber": "..." },
      ...
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

#### 3. GET /payments/:id
**Получение одного платежа по ID**

**Guards:** `JwtAuthGuard`
**Params:** UUID платежа

**Ответ:** Объект платежа с include всех relations

#### 4. PATCH /payments/:id
**Обновление платежа (только администраторы)**

**Guards:** `JwtAuthGuard`, `AdminGuard`
**Body:** `UpdatePaymentDto`

**Обновляемые поля:**
- `status`: PENDING | COMPLETED | FAILED | REFUNDED
- `transactionId`: строка (для онлайн-платежей)
- `notes`: строка

**Бизнес-логика:**
- При изменении статуса на COMPLETED - обновление счета
- При изменении статуса на REFUNDED - обновление счета (пересчет)
- Автоматическое обновление `updatedAt`

#### 5. DELETE /payments/:id
**Удаление платежа (только администраторы)**

**Guards:** `JwtAuthGuard`, `AdminGuard`

**Бизнес-логика:**
- Удаление записи о платеже
- **Автоматическое обновление статуса связанного счета**

---

## 💼 Бизнес-логика (PaymentsService)

### Основные методы

#### `create(data: CreatePaymentDto)`
Создание платежа с комплексной валидацией

**Алгоритм:**
1. **Валидация клиента:**
   ```typescript
   const client = await this.prisma.client.findUnique({ where: { id: clientId } });
   if (!client) throw new NotFoundException('Клиент не найден');
   ```

2. **Валидация счета:**
   ```typescript
   const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
   if (!invoice) throw new NotFoundException('Счет не найден');
   if (invoice.status === 'CANCELLED') throw new BadRequestException('Нельзя оплатить отмененный счет');
   ```

3. **Валидация суммы:**
   ```typescript
   const totalPaid = await this.calculateTotalPaid(invoiceId);
   const unpaidAmount = invoice.totalAmount - totalPaid;

   if (amount > unpaidAmount) {
     throw new BadRequestException(
       `Сумма платежа (${amount}) превышает непогашенную сумму счета (${unpaidAmount})`
     );
   }
   ```

4. **Автостатус для наличных:**
   ```typescript
   if (paymentMethod === 'CASH') {
     data.status = PaymentStatus.COMPLETED;
   }
   ```

5. **Создание платежа:**
   ```typescript
   const payment = await this.prisma.payment.create({
     data: {
       ...data,
       createdAt: new Date(),
       updatedAt: new Date(),
     },
     include: {
       client: true,
       invoice: true,
       subscription: true,
       rental: true,
     },
   });
   ```

6. **Обновление счета:**
   ```typescript
   await this.updateInvoiceStatus(invoiceId);
   ```

#### `calculateTotalPaid(invoiceId: string): Promise<number>`
Расчет общей оплаченной суммы для счета

**Алгоритм:**
```typescript
const result = await this.prisma.payment.aggregate({
  where: {
    invoiceId,
    status: PaymentStatus.COMPLETED, // Только завершенные платежи
  },
  _sum: {
    amount: true,
  },
});

return Number(result._sum.amount || 0);
```

#### `updateInvoiceStatus(invoiceId: string): Promise<void>`
Автоматическое обновление статуса счета на основе платежей

**Алгоритм:**
```typescript
const invoice = await this.prisma.invoice.findUnique({
  where: { id: invoiceId }
});
const totalPaid = await this.calculateTotalPaid(invoiceId);
const totalAmount = Number(invoice.totalAmount);

let newStatus: InvoiceStatus;
let paidAt: Date | null = null;

if (totalPaid >= totalAmount) {
  newStatus = InvoiceStatus.PAID;
  paidAt = new Date(); // Установить дату оплаты
} else if (totalPaid > 0) {
  newStatus = InvoiceStatus.PARTIALLY_PAID;
} else {
  newStatus = InvoiceStatus.PENDING;
}

await this.prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    status: newStatus,
    paidAt: paidAt,
  },
});
```

**Логика статусов:**
- `PAID`: totalPaid >= totalAmount (полностью оплачен)
- `PARTIALLY_PAID`: totalPaid > 0 && totalPaid < totalAmount
- `PENDING`: totalPaid === 0 (нет платежей)

#### `findAll(filter: PaymentFilterDto)`
Получение списка с фильтрацией и пагинацией

**Построение фильтров:**
```typescript
const where: Prisma.PaymentWhereInput = {
  ...(filter.clientId && { clientId: filter.clientId }),
  ...(filter.invoiceId && { invoiceId: filter.invoiceId }),
  ...(filter.subscriptionId && { subscriptionId: filter.subscriptionId }),
  ...(filter.rentalId && { rentalId: filter.rentalId }),
  ...(filter.paymentMethod && { paymentMethod: filter.paymentMethod }),
  ...(filter.paymentType && { paymentType: filter.paymentType }),
  ...(filter.status && { status: filter.status }),
  ...(filter.dateFrom || filter.dateTo) && {
    createdAt: {
      ...(filter.dateFrom && { gte: new Date(filter.dateFrom) }),
      ...(filter.dateTo && { lte: new Date(filter.dateTo) }),
    },
  },
};
```

**Пагинация:**
```typescript
const page = filter.page || 1;
const limit = filter.limit || 10;
const skip = (page - 1) * limit;

const [data, total] = await Promise.all([
  this.prisma.payment.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { client: true, invoice: true, subscription: true, rental: true },
  }),
  this.prisma.payment.count({ where }),
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
```

#### `update(id: string, data: UpdatePaymentDto)`
Обновление платежа с автообновлением счета

**Особенности:**
- Только администраторы могут обновлять
- При изменении статуса на COMPLETED или REFUNDED - пересчет счета
- Автоматическое обновление `updatedAt`

#### `remove(id: string)`
Удаление платежа с автообновлением счета

**Алгоритм:**
```typescript
const payment = await this.prisma.payment.findUnique({ where: { id } });
if (!payment) throw new NotFoundException('Платеж не найден');

const invoiceId = payment.invoiceId;

await this.prisma.payment.delete({ where: { id } });

// Обновить статус счета после удаления
if (invoiceId) {
  await this.updateInvoiceStatus(invoiceId);
}
```

---

## 🎨 Frontend

### Структура файлов

```
frontend/
├── app/(dashboard)/payments/
│   └── page.tsx                              (197 строк)
├── app/(dashboard)/invoices/[id]/components/
│   └── invoice-payments-section.tsx          (230 строк)
├── hooks/
│   └── use-payments.ts                       (112 строк)
├── lib/api/
│   └── payments.ts                           (55 строк)
└── lib/types/
    └── payments.ts                           (116 строк)
```

**Всего:** ~710 строк кода

### 1. Страница платежей

**Файл:** `frontend/app/(dashboard)/payments/page.tsx`

**Компоненты:**
```tsx
export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const { data: paymentsData } = usePayments(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Платежи</h1>
        <div className="text-sm text-muted-foreground">
          Всего: {paymentsData?.meta.total || 0}
        </div>
      </div>

      {/* Фильтр по статусу */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          <SelectItem value="PENDING">Ожидание</SelectItem>
          <SelectItem value="COMPLETED">Завершен</SelectItem>
          <SelectItem value="FAILED">Неудача</SelectItem>
          <SelectItem value="REFUNDED">Возврат</SelectItem>
        </SelectContent>
      </Select>

      {/* Таблица платежей */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Счет</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Метод</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                {formatDistance(new Date(payment.createdAt), new Date(), {
                  addSuffix: true,
                  locale: ru,
                })}
              </TableCell>
              <TableCell>
                {payment.client.lastName} {payment.client.firstName}
                <br />
                <span className="text-sm text-muted-foreground">
                  {payment.client.phone}
                </span>
              </TableCell>
              <TableCell>
                {payment.invoice?.invoiceNumber}
                <br />
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(payment.invoice?.totalAmount)}
                </span>
              </TableCell>
              <TableCell className="font-semibold">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                </Badge>
              </TableCell>
              <TableCell>
                {PAYMENT_TYPE_LABELS[payment.paymentType]}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(payment.status)}>
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Особенности:**
- Форматирование относительного времени (formatDistance с ru locale)
- Цветовые badges для статусов
- Форматирование валюты (RUB с 2 десятичными знаками)
- Фильтрация по статусу
- Пустое состояние при отсутствии данных

### 2. Интеграция в счета

**Файл:** `frontend/app/(dashboard)/invoices/[id]/components/invoice-payments-section.tsx`

**Компонент:** `InvoicePaymentsSection`

**Функционал:**
1. **Отображение прогресса оплаты:**
   ```tsx
   const totalPaid = payments
     .filter((p) => p.status === 'COMPLETED')
     .reduce((sum, p) => sum + Number(p.amount), 0);
   const unpaidAmount = Number(invoice.totalAmount) - totalPaid;

   <div className="space-y-2">
     <div className="flex justify-between text-sm">
       <span>Оплачено</span>
       <span className="font-medium">
         {formatCurrency(totalPaid)} из {formatCurrency(invoice.totalAmount)}
       </span>
     </div>
     <Progress value={(totalPaid / Number(invoice.totalAmount)) * 100} />
   </div>
   ```

2. **Остаток к оплате:**
   ```tsx
   {unpaidAmount > 0 && (
     <Alert>
       <AlertCircle className="h-4 w-4" />
       <AlertTitle>Остаток к оплате</AlertTitle>
       <AlertDescription>
         {formatCurrency(unpaidAmount)}
       </AlertDescription>
     </Alert>
   )}
   ```

3. **Диалог создания платежа:**
   ```tsx
   <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>Добавить платеж</DialogTitle>
       </DialogHeader>
       <div className="space-y-4">
         <div>
           <Label>Сумма</Label>
           <Input
             type="number"
             step="0.01"
             max={unpaidAmount}
             value={amount}
             onChange={(e) => setAmount(e.target.value)}
           />
           <p className="text-sm text-muted-foreground mt-1">
             Максимум: {formatCurrency(unpaidAmount)}
           </p>
         </div>
         <div>
           <Label>Метод оплаты</Label>
           <Select value={method} onValueChange={setMethod}>
             <SelectItem value="CASH">Наличные</SelectItem>
             <SelectItem value="CARD">Карта</SelectItem>
             <SelectItem value="ONLINE">Онлайн</SelectItem>
           </Select>
         </div>
       </div>
       <DialogFooter>
         <Button
           onClick={handleCreatePayment}
           disabled={!amount || Number(amount) > unpaidAmount}
         >
           Создать платеж
         </Button>
       </DialogFooter>
     </DialogContent>
   </Dialog>
   ```

4. **История платежей:**
   ```tsx
   <Table>
     <TableHeader>
       <TableRow>
         <TableHead>Дата</TableHead>
         <TableHead>Метод</TableHead>
         <TableHead>Сумма</TableHead>
         <TableHead>Статус</TableHead>
       </TableRow>
     </TableHeader>
     <TableBody>
       {payments.map((payment) => (
         <TableRow key={payment.id}>
           <TableCell>
             {format(new Date(payment.createdAt), 'dd.MM.yyyy HH:mm', {
               locale: ru,
             })}
           </TableCell>
           <TableCell>
             <Badge variant="outline">
               {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
             </Badge>
           </TableCell>
           <TableCell className="font-semibold">
             {formatCurrency(payment.amount)}
           </TableCell>
           <TableCell>
             <Badge variant={getStatusVariant(payment.status)}>
               {PAYMENT_STATUS_LABELS[payment.status]}
             </Badge>
           </TableCell>
         </TableRow>
       ))}
     </TableBody>
   </Table>
   ```

### 3. React Query хуки

**Файл:** `frontend/hooks/use-payments.ts`

**Реализованные хуки:**

```typescript
// 1. Список платежей с фильтрацией
export function usePayments(filters?: PaymentFilterDto) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsApi.getAll(filters),
  });
}

// 2. Один платеж по ID
export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.getById(id),
    enabled: !!id,
  });
}

// 3. Платежи клиента
export function useClientPayments(clientId: string) {
  return usePayments({ clientId });
}

// 4. Платежи по счету
export function useInvoicePayments(invoiceId: string) {
  return usePayments({ invoiceId });
}

// 5. Создание платежа
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      // Инвалидация связанных запросов
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      toast.success('Платеж создан');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка создания платежа');
    },
  });
}

// 6. Обновление платежа
export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentDto }) =>
      paymentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      toast.success('Платеж обновлен');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка обновления платежа');
    },
  });
}

// 7. Удаление платежа
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      toast.success('Платеж удален');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления платежа');
    },
  });
}
```

**Особенности:**
- Автоматическая инвалидация кэша для связанных запросов
- Toast уведомления об успехе/ошибке
- Поддержка всех CRUD операций
- Типобезопасность через TypeScript

### 4. API Client

**Файл:** `frontend/lib/api/payments.ts`

```typescript
import { apiClient } from './client';
import type {
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentFilterDto,
  PaginatedResponse,
} from '@/lib/types/payments';

export const paymentsApi = {
  // Создать платеж
  async create(data: CreatePaymentDto): Promise<Payment> {
    const response = await apiClient.post('/payments', data);
    return response.data;
  },

  // Получить все платежи с фильтрацией
  async getAll(filter?: PaymentFilterDto): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await apiClient.get(`/payments?${params.toString()}`);
    return response.data;
  },

  // Получить платеж по ID
  async getById(id: string): Promise<Payment> {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  // Обновить платеж
  async update(id: string, data: UpdatePaymentDto): Promise<Payment> {
    const response = await apiClient.patch(`/payments/${id}`, data);
    return response.data;
  },

  // Удалить платеж
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/payments/${id}`);
  },
};
```

### 5. TypeScript типы

**Файл:** `frontend/lib/types/payments.ts`

```typescript
// Enums
export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE';
export type PaymentType = 'SUBSCRIPTION' | 'RENTAL' | 'SINGLE_VISIT';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

// Основная модель
export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  status: PaymentStatus;
  transactionId?: string;
  subscriptionId?: string;
  rentalId?: string;
  invoiceId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  client?: Client;
  invoice?: Invoice;
  subscription?: Subscription;
  rental?: Rental;
}

// DTOs
export interface CreatePaymentDto {
  clientId: string;
  invoiceId?: string;
  subscriptionId?: string;
  rentalId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  transactionId?: string;
  notes?: string;
}

export interface UpdatePaymentDto {
  status?: PaymentStatus;
  transactionId?: string;
  notes?: string;
}

export interface PaymentFilterDto {
  clientId?: string;
  invoiceId?: string;
  subscriptionId?: string;
  rentalId?: string;
  paymentMethod?: PaymentMethod;
  paymentType?: PaymentType;
  status?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// Пагинация
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Локализация
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Наличные',
  CARD: 'Карта',
  ONLINE: 'Онлайн',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  SUBSCRIPTION: 'Абонемент',
  RENTAL: 'Аренда',
  SINGLE_VISIT: 'Разовое посещение',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Ожидание',
  COMPLETED: 'Завершен',
  FAILED: 'Неудача',
  REFUNDED: 'Возврат',
};
```

---

## 🔗 Интеграция с другими модулями

### 1. Модуль Счетов (Invoices)

**Связь:** Many-to-One (много платежей к одному счету)

**Интеграция:**
- Компонент `InvoicePaymentsSection` встроен в страницу детального просмотра счета
- Создание платежей напрямую из карточки счета
- Автоматический расчет остатка к оплате
- Отображение истории платежей

**Автоматические действия:**
- При создании платежа → обновление статуса Invoice
- При изменении статуса платежа → пересчет статуса Invoice
- При удалении платежа → пересчет статуса Invoice

### 2. Модуль Клиентов (Clients)

**Связь:** Many-to-One (много платежей от одного клиента)

**Интеграция:**
- Просмотр истории платежей клиента через `useClientPayments(clientId)`
- Фильтрация платежей по клиенту
- Отображение информации о клиенте в таблице платежей

### 3. Модуль Абонементов (Subscriptions)

**Связь:** Many-to-One (опционально, для backward compatibility)

**Интеграция:**
- Платежи за абонементы создаются через счета
- `subscriptionId` сохраняется для связи с абонементом
- `paymentType` автоматически определяется как SUBSCRIPTION

### 4. Навигация

**Файл:** `frontend/lib/config/navigation.ts`

```typescript
{
  title: 'Платежи',
  href: '/payments',
  icon: CreditCard,
  description: 'Управление платежами',
}
```

Пункт меню доступен всем авторизованным пользователям в разделе "Главное".

---

## 📊 Примеры использования

### Пример 1: Создание платежа за абонемент

**Сценарий:** Клиент оплачивает счет за абонемент наличными

```typescript
// Frontend (в InvoicePaymentsSection)
const { mutate: createPayment } = useCreatePayment();

const handleCreatePayment = () => {
  createPayment({
    clientId: invoice.clientId,
    invoiceId: invoice.id,
    subscriptionId: invoice.subscriptionId,
    amount: 5000.00,
    paymentMethod: 'CASH',
    paymentType: 'SUBSCRIPTION',
    notes: 'Оплата за абонемент на январь 2025',
  });
};
```

**Backend обработка:**
1. Валидация клиента и счета
2. Проверка суммы (5000 ≤ непогашенная сумма счета)
3. Создание платежа со статусом COMPLETED (т.к. CASH)
4. Автоматическое обновление Invoice:
   - Если totalPaid >= totalAmount → status = PAID, paidAt = now()
   - Иначе → status = PARTIALLY_PAID

**Результат:**
- Платеж создан со статусом COMPLETED
- Счет обновлен (PAID или PARTIALLY_PAID)
- Frontend автоматически обновлен (React Query invalidation)

### Пример 2: Частичная оплата счета

**Сценарий:** Счет на 10,000₽, клиент вносит 3,000₽

```typescript
// Первый платеж
createPayment({
  clientId: 'uuid',
  invoiceId: 'uuid',
  amount: 3000.00,
  paymentMethod: 'CASH',
  paymentType: 'SUBSCRIPTION',
});

// Backend:
// totalPaid = 3000
// totalAmount = 10000
// 3000 < 10000 → status = PARTIALLY_PAID

// Второй платеж (через неделю)
createPayment({
  clientId: 'uuid',
  invoiceId: 'uuid',
  amount: 7000.00,
  paymentMethod: 'CARD',
  paymentType: 'SUBSCRIPTION',
});

// Backend:
// totalPaid = 3000 + 7000 = 10000
// totalAmount = 10000
// 10000 >= 10000 → status = PAID, paidAt = now()
```

### Пример 3: Возврат платежа (администратор)

**Сценарий:** Клиент вернул абонемент, нужно вернуть деньги

```typescript
// Frontend (только для ADMIN)
const { mutate: updatePayment } = useUpdatePayment();

const handleRefund = (paymentId: string) => {
  updatePayment({
    id: paymentId,
    data: {
      status: 'REFUNDED',
      notes: 'Возврат средств по запросу клиента',
    },
  });
};
```

**Backend обработка:**
1. Проверка AdminGuard
2. Обновление статуса платежа на REFUNDED
3. Пересчет статуса счета:
   - Aggregate только COMPLETED платежей (REFUNDED исключаются)
   - Обновление Invoice status

**Результат:**
- Платеж помечен как REFUNDED
- Счет вернулся в статус PARTIALLY_PAID или PENDING
- paidAt сброшен, если счет больше не оплачен полностью

### Пример 4: Фильтрация платежей

**Сценарий:** Получить все завершенные платежи за последний месяц

```typescript
const { data } = usePayments({
  status: 'COMPLETED',
  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  dateTo: new Date().toISOString(),
  page: 1,
  limit: 50,
});

// Ответ:
// {
//   data: [...50 платежей...],
//   meta: {
//     total: 237,
//     page: 1,
//     limit: 50,
//     totalPages: 5
//   }
// }
```

---

## ⚠️ Известные ограничения

### 1. PaymentDetailsSheet не реализован
**Статус:** Не критично
**Описание:** Нет отдельного компонента для детального просмотра платежа
**Workaround:** Детали отображаются в таблице inline
**Планы:** Реализовать в будущих версиях

### 2. Расширенные фильтры в UI
**Статус:** Частично реализовано
**Описание:** На странице /payments реализован только фильтр по статусу
**API поддерживает:** clientId, invoiceId, method, type, dateRange
**Планы:** Добавить полный набор фильтров в UI

### 3. Отсутствие поля processedBy
**Статус:** Не критично
**Описание:** Нет явного поля для отслеживания кто обработал платеж
**Workaround:** Используется JWT auth для определения текущего пользователя
**Планы:** Добавить в будущих версиях для audit trail

### 4. Методы оплаты
**Статус:** Частично реализовано
**Описание:** Реализовано: CASH, CARD, ONLINE
**Не реализовано:** CARD_TERMINAL, BANK_TRANSFER (из оригинального плана)
**Планы:** Можно добавить в enum при необходимости

---

## 🔮 Планы развития (Roadmap)

### Фаза 2: UI улучшения

- [ ] Компонент PaymentDetailsSheet для детального просмотра
- [ ] Расширенные фильтры на странице /payments
- [ ] Графики и аналитика платежей
- [ ] Экспорт в Excel/PDF
- [ ] История изменений платежа

### Фаза 3: Интеграция платежных систем

- [ ] Интеграция с онлайн-платежами (ЮKassa, CloudPayments)
- [ ] Webhook обработка для онлайн-платежей
- [ ] Автоматическая обработка transactionId
- [ ] Email/SMS уведомления о платежах
- [ ] Чеки и квитанции (54-ФЗ)

### Фаза 4: Расширенная функциональность

- [ ] Планирование платежей (recurring)
- [ ] Рассрочка и частичная оплата (автоплатежи)
- [ ] Бонусные баллы и кэшбэк
- [ ] Интеграция с бухгалтерией (1С)

---

## 📈 Метрики производительности

### Индексы БД

Все критические поля проиндексированы для быстрого поиска:

```prisma
@@index([clientId])       // Платежи клиента
@@index([invoiceId])      // Платежи по счету
@@index([status])         // Фильтр по статусу
@@index([createdAt])      // Сортировка по дате
@@index([paymentType])    // Фильтр по типу
```

### Оптимизация запросов

1. **Aggregate для расчета totalPaid:**
   - Один запрос вместо загрузки всех платежей
   - Фильтр по status = COMPLETED

2. **Include relations:**
   - Загрузка связанных данных в одном запросе
   - Избежание N+1 проблемы

3. **Пагинация:**
   - Лимит 10-50 записей на страницу
   - Offset-based pagination

---

## 🧪 Тестирование

### Рекомендуемые тесты

**Backend:**
- [x] Unit-тесты для calculateTotalPaid
- [x] Unit-тесты для updateInvoiceStatus
- [ ] E2E тест: создание платежа → проверка Invoice status
- [ ] E2E тест: частичная оплата → PARTIALLY_PAID
- [ ] E2E тест: полная оплата → PAID с paidAt
- [ ] E2E тест: возврат платежа → пересчет Invoice
- [ ] Валидация: платеж превышает непогашенную сумму
- [ ] Проверка AdminGuard для update/delete

**Frontend:**
- [ ] Рендеринг таблицы платежей
- [ ] Фильтрация по статусу
- [ ] Создание платежа через InvoicePaymentsSection
- [ ] Валидация суммы (не превышает остаток)
- [ ] Toast уведомления при успехе/ошибке
- [ ] React Query кэш инвалидация

---

## 📝 Заметки разработчика

1. **Автоматическое обновление счетов** — критически важная функция. Всегда вызывайте `updateInvoiceStatus()` после любых изменений платежей.

2. **Валидация сумм** — предотвращает переплату. Сравнение с `unpaidAmount`, а не с `totalAmount`.

3. **CASH платежи** — автоматически COMPLETED, т.к. деньги получены сразу.

4. **React Query инвалидация** — инвалидировать `payments`, `invoices` И `clients` для корректного обновления всех связанных компонентов.

5. **TypeScript типы** — все DTOs и модели полностью типизированы для предотвращения ошибок.

6. **AdminGuard** — только администраторы могут обновлять/удалять платежи. Обычные пользователи могут только создавать и просматривать.

---

## 📚 Связанная документация

- [Модуль Счетов](./05_INVOICES_MODULE.md) — автоматическое обновление статусов
- [Модуль Клиентов](./01_CLIENTS_CRM_MODULE.md) — история платежей клиента
- [Модуль Абонементов](./06_SUBSCRIPTIONS_MODULE.md) — платежи за абонементы
- [ROADMAP](../ROADMAP.md) — общий план развития

---

**Последнее обновление:** 2025-11-17
**Автор:** Система управления артс-студией
