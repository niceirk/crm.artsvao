# API для разрешения конфликтов при синхронизации

## Проблема была решена

При изменении типа мероприятия или помещения в CRM и последующей синхронизации данные из Pyrus перезаписывали изменения в CRM без возможности выбора.

## Решение

Реализована система обнаружения и разрешения конфликтов с пользовательским выбором:

1. **Обнаружение конфликтов** - система определяет объекты, измененные в CRM после последней синхронизации
2. **Отображение в табличном виде** - API возвращает список конфликтов с данными из обеих систем
3. **Выбор способа разрешения** - пользователь выбирает для каждого конфликта:
   - `USE_CRM` - использовать версию из CRM (перезаписать Pyrus)
   - `USE_PYRUS` - использовать версию из Pyrus (перезаписать CRM)
   - `SKIP` - пропустить синхронизацию этого объекта
4. **Применение решений** - система синхронизирует согласно выбранным решениям

## Новые поля в БД

### Room
```prisma
lastSyncedAt DateTime? @map("last_synced_at")
```

### EventType
```prisma
lastSyncedAt DateTime? @map("last_synced_at")
```

Эти поля хранят время последней синхронизации для определения конфликтов.

## API Endpoints

### 1. GET /integrations/pyrus/detect-conflicts

Обнаружить конфликты при синхронизации.

**Response:**
```typescript
{
  "hasConflicts": boolean,
  "eventTypeConflicts": [
    {
      "id": "uuid",                    // ID в CRM
      "pyrusId": "12345",             // ID в Pyrus
      "crmData": {
        "name": "Концерт NEW",        // Название в CRM
        "description": "...",
        "color": "#ff0000",
        "updatedAt": "2025-11-17T19:30:00.000Z"
      },
      "pyrusData": {
        "name": "Концерт"             // Название в Pyrus
      },
      "lastSyncedAt": "2025-11-17T18:00:00.000Z"
    }
  ],
  "roomConflicts": [
    {
      "id": "uuid",                    // ID в CRM
      "pyrusId": "67890",             // ID в Pyrus
      "crmData": {
        "name": "Аудитория 101",      // Название в CRM
        "updatedAt": "2025-11-17T19:30:00.000Z"
      },
      "pyrusData": {
        "name": "Аудитория 1"         // Название в Pyrus
      },
      "lastSyncedAt": "2025-11-17T18:00:00.000Z"
    }
  ]
}
```

### 2. POST /integrations/pyrus/sync-with-resolution

Синхронизация с разрешением конфликтов.

**Request Body:**
```typescript
{
  "eventTypeResolutions": [
    {
      "id": "uuid",                   // ID объекта в CRM
      "resolution": "USE_CRM"         // USE_CRM | USE_PYRUS | SKIP
    }
  ],
  "roomResolutions": [
    {
      "id": "uuid",
      "resolution": "USE_PYRUS"
    }
  ]
}
```

**Response:**
```typescript
{
  "eventTypes": {
    "created": 0,
    "updated": 1,
    "skipped": 0,
    "errors": []
  },
  "rooms": {
    "created": 0,
    "updated": 1,
    "skipped": 0,
    "errors": []
  }
}
```

## Процесс синхронизации с разрешением конфликтов

### Шаг 1: Обнаружить конфликты

```bash
GET /integrations/pyrus/detect-conflicts
Authorization: Bearer <token>
```

Ответ покажет все объекты, которые были изменены в CRM после последней синхронизации и отличаются от данных в Pyrus.

### Шаг 2: Отобразить конфликты в UI

Создайте таблицу с конфликтами:

| Тип | Название в CRM | Название в Pyrus | Обновлено в CRM | Решение |
|-----|----------------|------------------|-----------------|---------|
| Тип мероприятия | Концерт NEW | Концерт | 17.11 19:30 | [USE_CRM] [USE_PYRUS] [SKIP] |
| Помещение | Аудитория 101 | Аудитория 1 | 17.11 19:30 | [USE_CRM] [USE_PYRUS] [SKIP] |

### Шаг 3: Пользователь выбирает решения

Для каждого конфликта пользователь выбирает:
- **USE_CRM** - оставить версию из CRM и обновить Pyrus
- **USE_PYRUS** - взять версию из Pyrus и обновить CRM
- **SKIP** - пропустить этот объект (не синхронизировать)

### Шаг 4: Отправить решения на сервер

```bash
POST /integrations/pyrus/sync-with-resolution
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventTypeResolutions": [
    {
      "id": "7777eb3e-eb99-4a8b-b7a9-88c1a2d29d9f",
      "resolution": "USE_CRM"
    }
  ],
  "roomResolutions": [
    {
      "id": "8888eb3e-eb99-4a8b-b7a9-88c1a2d29d9f",
      "resolution": "USE_PYRUS"
    }
  ]
}
```

### Шаг 5: Результат синхронизации

Сервер вернет статистику:
- Сколько объектов создано
- Сколько обновлено
- Сколько пропущено
- Список ошибок (если есть)

## Автоматическая синхронизация без конфликтов

Метод `syncWithConflictResolution` также синхронизирует объекты без конфликтов:
- Новые объекты в CRM → создаются в Pyrus
- Новые объекты в Pyrus → создаются в CRM
- Объекты без изменений после последней синхронизации → синхронизируются автоматически

Поэтому можно вызвать `/sync-with-resolution` с пустым телом запроса `{}` для синхронизации всех объектов без конфликтов.

## Логика определения конфликта

Конфликт возникает когда **все** условия выполнены:
1. Объект существует в обеих системах (есть `pyrusId`)
2. Объект был синхронизирован ранее (есть `lastSyncedAt`)
3. Объект изменен в CRM после последней синхронизации (`updatedAt > lastSyncedAt`)
4. Данные в CRM отличаются от данных в Pyrus (например, разные названия)

## Обновление `lastSyncedAt`

Поле `lastSyncedAt` обновляется:
- После успешной синхронизации из Pyrus в CRM
- После успешной синхронизации из CRM в Pyrus
- При разрешении конфликта любым способом (кроме SKIP)

Это позволяет отслеживать, когда последний раз объект был синхронизирован.

## Пример использования в UI

```typescript
// 1. Получить конфликты
const conflicts = await fetch('/integrations/pyrus/detect-conflicts', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 2. Отобразить таблицу с конфликтами
if (conflicts.hasConflicts) {
  showConflictsTable(conflicts);
}

// 3. Пользователь выбирает решения
const resolutions = {
  eventTypeResolutions: conflicts.eventTypeConflicts.map(c => ({
    id: c.id,
    resolution: userChoice // 'USE_CRM' | 'USE_PYRUS' | 'SKIP'
  })),
  roomResolutions: conflicts.roomConflicts.map(c => ({
    id: c.id,
    resolution: userChoice
  }))
};

// 4. Синхронизировать с решениями
const result = await fetch('/integrations/pyrus/sync-with-resolution', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(resolutions)
}).then(r => r.json());

// 5. Показать результат
console.log(`Создано: ${result.eventTypes.created + result.rooms.created}`);
console.log(`Обновлено: ${result.eventTypes.updated + result.rooms.updated}`);
console.log(`Пропущено: ${result.eventTypes.skipped + result.rooms.skipped}`);
```

## Преимущества нового подхода

1. **Контроль пользователя** - пользователь видит все конфликты и решает сам
2. **Прозрачность** - четко видно, что изменилось и где
3. **Гибкость** - можно выбрать разные решения для разных объектов
4. **Безопасность** - данные не перезаписываются автоматически без ведома пользователя
5. **Отслеживание** - поле `lastSyncedAt` позволяет понять, когда была последняя синхронизация

## Миграция для существующих данных

При первом запуске после обновления:
- Поле `lastSyncedAt` у всех объектов будет `null`
- Это значит, что конфликты не будут обнаружены
- После первой синхронизации поле заполнится
- Дальнейшие синхронизации будут корректно отслеживать конфликты

Рекомендуется после обновления запустить синхронизацию один раз, чтобы инициализировать `lastSyncedAt` для всех объектов.
