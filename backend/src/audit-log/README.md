# Audit Logging Module

Модуль для логирования всех операций с данными в системе.

## Возможности

- Автоматическое логирование операций CREATE, UPDATE, DELETE
- Хранение изменений "до" и "после" для UPDATE
- Привязка к пользователю, выполнившему операцию
- API для просмотра истории изменений

## Использование

### В сервисах

```typescript
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '@prisma/client';

export class YourService {
  constructor(private auditLog: AuditLogService) {}

  async create(data: CreateDto, userId: string) {
    const entity = await this.prisma.entity.create({ data });

    // Лог создания
    await this.auditLog.log({
      userId,
      action: AuditAction.CREATE,
      entityType: 'EntityName',
      entityId: entity.id,
      changes: { created: data },
    });

    return entity;
  }

  async update(id: string, data: UpdateDto, userId: string) {
    const oldEntity = await this.findOne(id);
    const updated = await this.prisma.entity.update({ where: { id }, data });

    // Лог обновления
    await this.auditLog.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'EntityName',
      entityId: id,
      changes: {
        before: oldEntity,
        after: data,
      },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const entity = await this.findOne(id);
    await this.prisma.entity.delete({ where: { id } });

    // Лог удаления
    await this.auditLog.log({
      userId,
      action: AuditAction.DELETE,
      entityType: 'EntityName',
      entityId: id,
      changes: { deleted: entity },
    });
  }
}
```

## API Endpoints

### 1. Получить последние логи
```
GET /api/audit-logs?limit=100
```

Возвращает последние N записей аудит-логов.

### 2. История изменений сущности
```
GET /api/audit-logs/entity/{entityType}/{entityId}
```

Пример:
```
GET /api/audit-logs/entity/Client/5113cf00-db63-462b-8a5a-267e3ba1014c
```

Возвращает полную историю изменений конкретной сущности.

### 3. Логи пользователя
```
GET /api/audit-logs/user/{userId}?limit=50
```

Возвращает все действия пользователя.

## Структура Audit Log

```typescript
{
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  changes: {
    created?: any;      // Для CREATE
    before?: any;       // Для UPDATE
    after?: any;        // Для UPDATE
    deleted?: any;      // Для DELETE
  };
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}
```

## Примеры ответов

### CREATE
```json
{
  "action": "CREATE",
  "entityType": "Client",
  "changes": {
    "created": {
      "firstName": "Иван",
      "lastName": "Иванов",
      "phone": "+79001234567"
    }
  }
}
```

### UPDATE
```json
{
  "action": "UPDATE",
  "entityType": "Client",
  "changes": {
    "before": {
      "phone": "+79001234567",
      "notes": null
    },
    "after": {
      "phone": "+79009999999",
      "notes": "Обновлено"
    }
  }
}
```

### DELETE
```json
{
  "action": "DELETE",
  "entityType": "Client",
  "changes": {
    "deleted": {
      "id": "...",
      "name": "Иван Иванов",
      "status": "INACTIVE"
    }
  }
}
```

## Интеграция с другими модулями

Модуль уже интегрирован с:
- ✅ ClientsModule - логирование операций с клиентами

Для добавления в другие модули:

1. Импортируйте AuditLogModule в ваш модуль
2. Добавьте AuditLogService в конструктор сервиса
3. Вызывайте `auditLog.log()` после операций CUD
4. Передавайте userId из контроллера в сервис

## Производительность

- Логирование выполняется асинхронно
- Ошибки логирования не блокируют основные операции
- Индексы настроены для быстрого поиска по:
  - userId
  - entityType
  - entityId
  - action
  - createdAt
