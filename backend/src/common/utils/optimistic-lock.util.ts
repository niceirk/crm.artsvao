import { ConflictException } from '@nestjs/common';

/**
 * Данные о конфликте версий для передачи на frontend
 */
export interface OptimisticLockConflictData {
  message: string;
  entity: string;
  entityId: string;
  expectedVersion: number;
  currentVersion: number;
  currentData: any;
}

/**
 * Ошибка оптимистичной блокировки - возвращает 409 Conflict
 */
export class OptimisticLockError extends ConflictException {
  constructor(
    entity: string,
    entityId: string,
    expectedVersion: number,
    currentVersion: number,
    currentData: any,
  ) {
    const conflictData: OptimisticLockConflictData = {
      message: 'Данные были изменены другим пользователем',
      entity,
      entityId,
      expectedVersion,
      currentVersion,
      currentData,
    };
    super(conflictData);
  }
}

/**
 * Тип для моделей с поддержкой версионирования
 */
export interface VersionedEntity {
  id: string;
  version: number;
}

/**
 * Проверяет версию и выбрасывает ошибку если данные устарели
 */
export function checkVersion<T extends VersionedEntity>(
  entity: T,
  expectedVersion: number,
  entityName: string,
): void {
  if (entity.version !== expectedVersion) {
    throw new OptimisticLockError(
      entityName,
      entity.id,
      expectedVersion,
      entity.version,
      entity,
    );
  }
}

/**
 * Тип для Prisma транзакции
 */
export type PrismaTransaction = {
  [key: string]: {
    updateMany: (args: any) => Promise<{ count: number }>;
    findUnique: (args: any) => Promise<any>;
  };
};

/**
 * Атомарное обновление с проверкой версии
 * Использует updateMany с условием where для атомарной проверки версии
 *
 * @param tx - Prisma транзакция или клиент
 * @param model - Имя модели (например: 'subscription', 'attendance')
 * @param id - ID записи
 * @param expectedVersion - Ожидаемая версия записи
 * @param data - Данные для обновления (без version - он автоинкрементится)
 * @returns Обновлённая запись
 * @throws OptimisticLockError если версия не совпадает
 */
export async function updateWithVersionCheck<T extends VersionedEntity>(
  tx: any,
  model: string,
  id: string,
  expectedVersion: number,
  data: Partial<Omit<T, 'id' | 'version'>>,
  include?: Record<string, boolean | object>,
): Promise<T> {
  // Атомарное обновление: проверяем версию И обновляем в одном запросе
  const result = await tx[model].updateMany({
    where: {
      id,
      version: expectedVersion,
    },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  // Если ни одна запись не обновлена - версия не совпала
  if (result.count === 0) {
    const current = await tx[model].findUnique({
      where: { id },
    });

    if (!current) {
      throw new ConflictException(`Запись ${model} с id ${id} не найдена`);
    }

    throw new OptimisticLockError(
      model,
      id,
      expectedVersion,
      current.version,
      current,
    );
  }

  // Возвращаем обновлённую запись
  return tx[model].findUnique({
    where: { id },
    ...(include && { include }),
  });
}

/**
 * Атомарный декремент с проверкой на положительное значение
 * Используется для списания с абонемента
 *
 * @param tx - Prisma транзакция
 * @param subscriptionId - ID абонемента
 * @param amount - Количество для списания (по умолчанию 1)
 * @returns true если успешно списано, false если недостаточно
 */
export async function atomicDecrementVisits(
  tx: any,
  subscriptionId: string,
  amount: number = 1,
): Promise<boolean> {
  const result = await tx.subscription.updateMany({
    where: {
      id: subscriptionId,
      remainingVisits: { gte: amount },
    },
    data: {
      remainingVisits: { decrement: amount },
      version: { increment: 1 },
    },
  });

  return result.count > 0;
}
