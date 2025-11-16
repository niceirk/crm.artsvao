# ⚡ Быстрый чеклист производительности

## 🗄️ Новая модель Prisma?

```prisma
model Example {
  id       String @id
  foreignId String @map("foreign_id")

  @@index([foreignId])     // ✅ FK индекс
  @@index([searchField])   // ✅ Поля для поиска
  @@index([field1, field2]) // ✅ Составные индексы
}
```

Не забудь GIN индексы для текстового поиска!

---

## 🔧 Новый Service метод?

```typescript
async findAll(filter?: FilterDto) {
  const page = filter?.page || 1;
  const limit = filter?.limit || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.model.findMany({
      where,
      include: {
        relation: {
          select: { id: true, name: true }, // ✅ select
        }
      },
      skip,    // ✅ пагинация
      take: limit,
    }),
    this.prisma.model.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
```

**Чек:**
- ✅ Пагинация (page, limit, skip, take)
- ✅ Возврат { data, meta }
- ✅ select вместо полной загрузки
- ✅ take для связей 1-to-many
- ✅ Нет N+1 (запросы в циклах)

---

## 📝 Новый DTO?

```typescript
export class FilterDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
```

---

## ⚛️ Новый React Hook?

```typescript
// Обычный список
export const useItems = (filter) => {
  return useQuery({
    queryKey: ['items', filter],
    queryFn: () => getItems(filter),
    staleTime: 5 * 60 * 1000, // ✅ 5 мин
  });
};

// Поиск
export const useSearch = (query: string) => {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(handler);
  }, [query]);

  return useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length >= 2, // ✅ мин. 2 символа
  });
};
```

**Чек:**
- ✅ staleTime: 5 мин (обычное) / 10 мин (справочники)
- ✅ Debounce 500ms для поиска
- ✅ enabled для минимальной длины

---

## 🎨 Frontend страница со списком?

```typescript
const { data: response } = useItems({ page, limit });

const items = response?.data;      // ✅ Данные
const meta = response?.meta;       // ✅ Метаданные

return (
  <div>
    <p>Всего: {meta?.total}</p>
    {items?.map(item => ...)}
  </div>
);
```

---

## 🚫 НЕ ДЕЛАЙ:

- ❌ `include` без `select`
- ❌ Запросы в циклах (N+1)
- ❌ Списки без пагинации
- ❌ Связи без `take`
- ❌ Поиск без debounce
- ❌ Индексы на FK

---

## ✅ ЦЕЛЕВЫЕ ПОКАЗАТЕЛИ:

- API списки: **< 1 сек**
- API поиск: **< 500 мс**
- Frontend загрузка: **< 2 сек**
- Повторная загрузка (кэш): **< 500 мс**

---

Подробности: **PERFORMANCE_BEST_PRACTICES.md**
