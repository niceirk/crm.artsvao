# Лучшие практики производительности

Этот документ содержит обязательные паттерны и практики для поддержания высокой производительности приложения.

## 📚 Содержание

- [База данных](#база-данных)
- [Backend API](#backend-api)
- [Frontend](#frontend)
- [Чеклисты](#чеклисты)

---

## База данных

### 1. Индексы в Prisma Schema

#### ✅ Обязательные индексы:

**Foreign Keys:**
```prisma
model Post {
  id       String @id @default(uuid())
  authorId String @map("author_id")
  author   User   @relation(fields: [authorId], references: [id])

  @@index([authorId])  // ✅ ОБЯЗАТЕЛЬНО для каждого FK
  @@map("posts")
}
```

**Поля для поиска:**
```prisma
model Client {
  firstName String @map("first_name")
  lastName  String @map("last_name")
  phone     String
  email     String?

  @@index([firstName])  // Обычный индекс
  @@index([lastName])
  @@index([phone])
  @@index([email])
  @@map("clients")
}
```

**GIN индексы для текстового поиска:**
```sql
-- Создаются вручную после миграции:
CREATE INDEX clients_first_name_gin_idx ON clients USING gin (first_name gin_trgm_ops);
CREATE INDEX clients_last_name_gin_idx ON clients USING gin (last_name gin_trgm_ops);
CREATE INDEX clients_phone_gin_idx ON clients USING gin (phone gin_trgm_ops);
CREATE INDEX clients_email_gin_idx ON clients USING gin (email gin_trgm_ops);
```

**Составные индексы для частых фильтров:**
```prisma
model Invoice {
  clientId String
  status   InvoiceStatus

  @@index([clientId])          // Одиночный
  @@index([status])            // Одиночный
  @@index([clientId, status])  // ✅ Составной для фильтрации
}
```

#### 🔍 Когда нужен индекс:

- ✅ Все foreign keys
- ✅ Поля в WHERE условиях
- ✅ Поля для сортировки (ORDER BY)
- ✅ Поля для поиска (LIKE/ILIKE)
- ✅ Комбинации полей, используемые вместе в фильтрах

#### ❌ Когда НЕ нужен индекс:

- ❌ Поля, которые редко используются в запросах
- ❌ Таблицы с < 1000 записей (опционально)
- ❌ Поля с низкой селективностью (boolean с одинаковым распределением)

---

### 2. Оптимизация запросов Prisma

#### ✅ Используйте `select` вместо полной загрузки:

**❌ Плохо:**
```typescript
const user = await prisma.user.findUnique({
  where: { id },
  include: { profile: true }  // Загружает ВСЕ поля profile
});
```

**✅ Хорошо:**
```typescript
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    profile: {
      select: {  // Только нужные поля
        id: true,
        firstName: true,
        lastName: true,
      }
    }
  }
});
```

#### ✅ Всегда используйте лимиты для связей:

**❌ Плохо:**
```typescript
const client = await prisma.client.findUnique({
  where: { id },
  include: {
    invoices: true,  // Может загрузить 1000+ счетов!
  }
});
```

**✅ Хорошо:**
```typescript
const client = await prisma.client.findUnique({
  where: { id },
  include: {
    invoices: {
      take: 10,  // Максимум 10
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
      }
    }
  }
});
```

#### ✅ Избегайте N+1 проблем:

**❌ Плохо (N+1):**
```typescript
const clients = await prisma.client.findMany();

for (const client of clients) {
  const invoices = await prisma.invoice.findMany({
    where: { clientId: client.id }  // ❌ Запрос в цикле!
  });
}
```

**✅ Хорошо:**
```typescript
const clients = await prisma.client.findMany({
  include: {
    invoices: {
      take: 5,
      select: { id: true, totalAmount: true }
    }
  }
});
```

---

## Backend API

### 1. Пагинация

#### ✅ ОБЯЗАТЕЛЬНО для всех списков:

**Шаблон DTO:**
```typescript
import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterDto {
  // ... другие фильтры

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)  // Максимум 100 записей
  @IsOptional()
  limit?: number = 20;
}
```

**Шаблон Service:**
```typescript
async findAll(filter?: FilterDto) {
  const page = filter?.page || 1;
  const limit = filter?.limit || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.model.findMany({
      where,
      skip,
      take: limit,
      // Оптимизированные includes с select
      include: {
        relation: {
          select: { id: true, name: true }
        }
      }
    }),
    this.prisma.model.count({ where })
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

#### Рекомендуемые лимиты по умолчанию:

- Клиенты: `20`
- Счета: `20`
- Платежи: `20`
- Услуги: `50`
- Журналы/логи: `50`
- Административные данные: `100`

---

### 2. Поиск

#### ✅ Используйте подготовленные GIN индексы:

```typescript
async search(query: string) {
  // ✅ GIN индексы автоматически используются для ILIKE
  return this.prisma.client.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,  // ✅ ВСЕГДА ограничивайте результаты
    select: {  // ✅ Только нужные поля
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
    }
  });
}
```

---

### 3. Connection Pool

**Настройки в DATABASE_URL (.env):**
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

**Рекомендации:**
- Development: `connection_limit=5`
- Production: `connection_limit=10` (или число CPU * 2)
- `pool_timeout=20` секунд

---

## Frontend

### 1. React Query конфигурация

**Глобальная конфигурация (lib/providers/query-provider.tsx):**
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 минут - данные свежие
      gcTime: 10 * 60 * 1000,         // 10 минут - в кэше
      refetchOnWindowFocus: false,    // Не перезапрашивать при фокусе
      refetchOnMount: true,           // Перезапрашивать при монтировании
      retry: 1,                       // 1 попытка повтора
    },
  },
});
```

**Для часто меняющихся данных:**
```typescript
export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices,
    staleTime: 1 * 60 * 1000,  // 1 минута для часто меняющихся данных
  });
};
```

**Для редко меняющихся данных:**
```typescript
export const useServices = () => {
  return useQuery({
    queryKey: ['services'],
    queryFn: getServices,
    staleTime: 10 * 60 * 1000,  // 10 минут для справочников
  });
};
```

---

### 2. Debounce для поиска

**✅ ОБЯЗАТЕЛЬНО для всех полей поиска:**

```typescript
export const useSearchClients = (query: string, delay: number = 500) => {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(handler);
  }, [query, delay]);

  return useQuery({
    queryKey: ['clients', 'search', debouncedQuery],
    queryFn: () => searchClients(debouncedQuery),
    enabled: debouncedQuery.length >= 2,  // ✅ Минимум 2 символа
    staleTime: 5 * 60 * 1000,
  });
};
```

**Рекомендуемые задержки:**
- Поиск клиентов: `500ms`
- Автокомплит: `300ms`
- Фильтры: `500ms`

---

### 3. Работа с пагинированными данными

**✅ Правильная обработка ответа:**

```typescript
// Backend возвращает:
// { data: [...], meta: { page, limit, total, totalPages } }

const { data: response } = useInvoices({ page: 1, limit: 20 });

const invoices = response?.data;
const meta = response?.meta;

// Отображение:
return (
  <div>
    <p>Всего: {meta?.total}</p>
    {invoices?.map(invoice => <InvoiceCard key={invoice.id} {...invoice} />)}
  </div>
);
```

---

## Чеклисты

### ✅ Чеклист: Создание новой модели Prisma

- [ ] Добавлены индексы на все foreign keys
- [ ] Добавлены индексы на поля для поиска
- [ ] Добавлены составные индексы для частых комбинаций фильтров
- [ ] Если есть текстовый поиск - создана задача на GIN индексы
- [ ] Проверены типы полей (использовать `@db.Decimal` для денег)
- [ ] Добавлены `createdAt` и `updatedAt` где нужно

### ✅ Чеклист: Создание нового Service

- [ ] `findAll()` имеет пагинацию (page, limit, skip, take)
- [ ] `findAll()` возвращает `{ data, meta }`
- [ ] Все `include` используют `select` для выбора полей
- [ ] Для связей 1-to-many добавлен `take` лимит
- [ ] Методы поиска ограничены `take: 20`
- [ ] Нет запросов в циклах (N+1)
- [ ] Используется `Promise.all()` для параллельных запросов

### ✅ Чеклист: Создание нового DTO

- [ ] Добавлены поля `page?: number = 1`
- [ ] Добавлены поля `limit?: number = [20|50]`
- [ ] Используются декораторы `@Type(() => Number)` для query params
- [ ] Добавлена валидация `@Min(1)`, `@Max(100)`

### ✅ Чеклист: Создание нового React Hook

- [ ] Настроен правильный `staleTime` (5 мин для обычных, 10 мин для справочников)
- [ ] Для поиска добавлен debounce (500ms)
- [ ] Для поиска добавлено `enabled: query.length >= 2`
- [ ] Обрабатывается формат `{ data, meta }` от API
- [ ] Query key включает все параметры фильтрации

### ✅ Чеклист: Код ревью

- [ ] Проверить наличие пагинации в списках
- [ ] Проверить отсутствие `include` без `select`
- [ ] Проверить отсутствие запросов в циклах
- [ ] Проверить наличие лимитов для связей
- [ ] Проверить debounce для полей поиска
- [ ] Проверить обработку пагинированных ответов на frontend

---

## 📊 Метрики производительности

### Целевые показатели:

**Backend API (время ответа):**
- GET списки: < 1 сек
- GET одна запись: < 500 мс
- Поиск: < 500 мс
- POST/PUT/DELETE: < 1 сек

**Frontend (загрузка страницы):**
- Первая отрисовка: < 2 сек
- Интерактивность: < 3 сек
- Повторная загрузка (кэш): < 500 мс

**База данных:**
- Запросы с индексами: < 100 мс
- Запросы без индексов: НЕ ДОЛЖНО БЫТЬ

### Как измерять:

**Backend:**
```typescript
// В сервисе для отладки:
const start = Date.now();
const result = await this.prisma.model.findMany(...);
console.log(`Query took: ${Date.now() - start}ms`);
```

**Frontend:**
```typescript
// React Query DevTools покажет время запросов
// Или используйте Network tab в браузере
```

---

## 🔧 Инструменты мониторинга

### Рекомендуется установить:

1. **pg_stat_statements** (PostgreSQL):
   ```sql
   CREATE EXTENSION pg_stat_statements;

   -- Просмотр медленных запросов:
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **Prisma Query Logs** (Development):
   ```typescript
   // prisma.service.ts
   this.prisma.$on('query', (e) => {
     console.log('Query: ' + e.query);
     console.log('Duration: ' + e.duration + 'ms');
   });
   ```

3. **React Query DevTools** (уже подключен):
   ```typescript
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   ```

---

## 📚 Дополнительные ресурсы

- [Prisma Performance Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)

---

## 🔄 Обновление документа

**Последнее обновление:** 2024-11-16
**Версия:** 1.0

При обнаружении новых паттернов или проблем производительности - обновляйте этот документ.
