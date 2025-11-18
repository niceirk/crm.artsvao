# Инструкции для Claude Code — Проект Artsvao

## Общая информация о проекте

**Artsvao** — система управления культурным центром (CRM + расписание + аренда помещений).

**Архитектура:**
- **Backend:** NestJS 10.x (TypeScript)
- **Frontend:** Next.js 14.x App Router (React 18, TypeScript)
- **Database:** PostgreSQL 16 + Prisma ORM 6.x
- **Контейнеризация:** Docker + Docker Compose

---

## 🔴 ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ: Стандарты кодирования

**При написании любого кода ВСЕГДА следуйте стандартам из документа:**

📘 **[CODING_STANDARDS.md](./CODING_STANDARDS.md)**

### Ключевые принципы, которые НЕОБХОДИМО соблюдать:

#### 1. **Clean Code & SOLID**
- ✅ Single Responsibility — один класс = одна задача
- ✅ Dependency Injection — используй DI NestJS
- ✅ DRY — не дублируй код, создавай shared services
- ✅ KISS — простота важнее сложности

#### 2. **Performance & Optimization**

**Backend:**
```typescript
// ✅ ВСЕГДА используй Promise.all для параллельных запросов
const [data, total] = await Promise.all([
  this.prisma.client.findMany({ skip, take }),
  this.prisma.client.count(),
]);

// ✅ ВСЕГДА используй select/include с лимитами
include: {
  subscriptions: { take: 5, orderBy: { createdAt: 'desc' } }
}

// ✅ ВСЕГДА добавляй пагинацию
const { page = 1, limit = 20 } = filterDto;
```

**Frontend:**
```typescript
// ✅ Используй мемоизацию для дорогих вычислений
const filtered = useMemo(() => data.filter(...), [data]);

// ✅ Используй debouncing для поиска
const [debouncedSearch] = useDebounce(search, 300);

// ✅ React Query автоматически кеширует
const { data } = useClients(filters);
```

#### 3. **Структура кода**

**Backend (NestJS):**
```
src/module-name/
├── module-name.module.ts
├── module-name.controller.ts
├── module-name.service.ts
└── dto/
    ├── create-module-name.dto.ts
    ├── update-module-name.dto.ts
    └── filter-module-name.dto.ts
```

**Frontend (Next.js):**
```
app/(dashboard)/module-name/
├── page.tsx
├── [id]/page.tsx
└── components/
    ├── module-table.tsx
    └── module-form.tsx
```

#### 4. **Именование**

| Что | Формат | Пример |
|-----|--------|--------|
| Файлы | kebab-case | `clients.service.ts` |
| Классы | PascalCase | `ClientsService` |
| Функции | camelCase | `findAll()` |
| Константы | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| React компоненты | PascalCase | `ClientCard` |

#### 5. **TypeScript**

```typescript
// ✅ ВСЕГДА типизируй props
interface ClientCardProps {
  client: Client;
  onEdit: (id: string) => void;
}

// ✅ Используй DTO с валидацией
export class CreateClientDto {
  @IsString({ message: 'Имя должно быть строкой' })
  @MinLength(2, { message: 'Минимум 2 символа' })
  firstName: string;
}

// ✅ Используй Prisma типы
const where: Prisma.ClientWhereInput = {};
```

#### 6. **Error Handling**

```typescript
// ✅ Используй встроенные NestJS exceptions
throw new NotFoundException(`Client with ID ${id} not found`);
throw new BadRequestException('Invalid data');
throw new ConflictException('Already exists');

// ✅ Обрабатывай ошибки в React Query
onError: (error: any) => {
  toast({
    variant: 'destructive',
    title: 'Ошибка',
    description: error.response?.data?.message || 'Произошла ошибка',
  });
}
```

#### 7. **Database (Prisma)**

```prisma
// ✅ ВСЕГДА используй эти паттерны:
model Client {
  id        String   @id @default(uuid())
  firstName String   @map("first_name")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Индексы для оптимизации
  @@index([status])
  @@index([createdAt])
  @@index([status, createdAt])
  @@map("clients")
}
```

#### 8. **Git Commits**

```bash
# ✅ Используй Conventional Commits
feat(clients): add search functionality
fix(auth): fix refresh token expiration
docs(readme): update installation guide
refactor(events): optimize conflict checker
```

#### 9. **Self-Documenting Code**

```typescript
// ✅ Код должен быть понятен без комментариев
const activeClients = clients.filter(c => c.status === 'ACTIVE');

// ✅ Комментарии только для сложной логики
// Проверяем конфликты для всех комнат одновременно
// вместо N×4 запросов делаем 4 параллельных
const [schedules, rentals, events] = await Promise.all([...]);
```

---

## Специфичные правила проекта

### Backend (NestJS)

1. **Всегда используй Soft Delete:**
   ```typescript
   // ✅ Обновление статуса вместо удаления
   await this.prisma.client.update({
     where: { id },
     data: { status: ClientStatus.INACTIVE }
   });
   ```

2. **Всегда логируй изменения через AuditLogService:**
   ```typescript
   await this.auditLog.log({
     userId,
     action: AuditAction.CREATE,
     entityType: 'Client',
     entityId: client.id,
     changes: { created: dto },
   });
   ```

3. **Используй ConflictCheckerService для проверки конфликтов:**
   ```typescript
   await this.conflictChecker.checkConflicts({
     date: dto.date,
     startTime: dto.startTime,
     endTime: dto.endTime,
     roomIds: [dto.roomId],
   });
   ```

4. **Global JwtAuthGuard с @Public декоратором:**
   ```typescript
   @Public() // Для открытых endpoints
   @Post('login')
   login(@Body() loginDto: LoginDto) {}
   ```

### Frontend (Next.js)

1. **Используй shadcn/ui компоненты:**
   ```typescript
   import { Button } from '@/components/ui/button';
   import { Card, CardContent, CardHeader } from '@/components/ui/card';
   ```

2. **React Query для всех API запросов:**
   ```typescript
   const { data, isLoading } = useClients(filters);
   const createMutation = useCreateClient();
   ```

3. **Zustand для глобального состояния:**
   ```typescript
   const { user, isAuthenticated } = useAuthStore();
   ```

4. **Tailwind для стилизации:**
   ```typescript
   <div className="flex items-center justify-between p-4 rounded-lg">
   ```

### Database (Prisma)

1. **Миграции:** `npx prisma migrate dev --name descriptive_name`
2. **Формат имен миграций:** `YYYYMMDDHHMMSS_descriptive_name`
3. **Всегда добавляй индексы** на поля в `where`, `orderBy`

---

## Что делать, если не уверен

1. **Проверь CODING_STANDARDS.md** — там есть примеры для большинства случаев
2. **Посмотри аналогичный код** в проекте:
   - Backend: `src/clients/` — эталонный модуль
   - Frontend: `app/(dashboard)/clients/` — эталонная страница
3. **Спроси у пользователя**, если требование неоднозначно

---

## Чек-лист перед завершением задачи

Перед тем как завершить написание кода, убедись:

- [ ] Код следует CODING_STANDARDS.md
- [ ] Используется TypeScript с типизацией
- [ ] Backend: есть валидация через DTO
- [ ] Backend: есть error handling
- [ ] Backend: оптимизированы запросы к БД (Promise.all, select, pagination)
- [ ] Frontend: используются React Query hooks
- [ ] Frontend: используются shadcn/ui компоненты
- [ ] Понятные имена переменных/функций (self-documenting code)
- [ ] Нет дублирования кода (DRY)
- [ ] Нет console.log в финальном коде
- [ ] Git commit следует Conventional Commits

---

## Приоритет источников информации

При написании кода используй в таком порядке:

1. **CODING_STANDARDS.md** — главный источник правил
2. **Существующий код проекта** — примеры реализации
3. **Официальная документация** (NestJS, Next.js, Prisma)
4. **Вопросы пользователю** — если что-то неясно

---

## Важные файлы проекта

- `CODING_STANDARDS.md` — **стандарты кодирования (ОБЯЗАТЕЛЬНО читать)**
- `backend/src/shared/conflict-checker.service.ts` — эталон оптимизации
- `backend/src/clients/` — эталонный backend модуль
- `frontend/app/(dashboard)/clients/` — эталонная frontend страница
- `backend/prisma/schema.prisma` — схема БД
- `docker-compose.prod.yml` — production конфигурация

---

**Помни:** Качество кода важнее скорости написания. Лучше потратить больше времени и написать правильно с первого раза, чем потом рефакторить.
