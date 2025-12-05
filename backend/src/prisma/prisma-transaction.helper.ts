import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const logger = new Logger('SafeTransaction');

/**
 * Коды ошибок Prisma, при которых транзакцию можно повторить
 */
const RETRYABLE_ERROR_CODES = ['P1001', 'P1002', 'P1008', 'P2024', 'P2028'];

/**
 * PostgreSQL native error codes для retry
 */
const RETRYABLE_SQL_STATES = ['57P01', '57P02', '57P03', '57P05', '08006', '08003', '40001'];

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 100;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_WAIT_MS = 5000; // Время ожидания соединения из пула

interface SafeTransactionOptions {
  /** Максимальное количество попыток (по умолчанию 3) */
  maxRetries?: number;
  /** Базовая задержка между попытками в мс (по умолчанию 100) */
  baseDelayMs?: number;
  /** Таймаут транзакции в мс (по умолчанию 30000) */
  timeoutMs?: number;
  /** Время ожидания соединения из пула в мс (по умолчанию 5000) */
  maxWaitMs?: number;
  /** Уровень изоляции транзакции */
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Проверяет, можно ли повторить транзакцию при данной ошибке
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_ERROR_CODES.includes(error.code);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const message = error.message;
    if (RETRYABLE_SQL_STATES.some((state) => message.includes(state))) {
      return true;
    }
    if (
      message.includes('idle-session timeout') ||
      message.includes('connection') ||
      message.includes('ECONNRESET') ||
      message.includes('EPIPE') ||
      message.includes('deadlock') ||
      message.includes('Transaction not found') ||
      message.includes('old closed transaction')
    ) {
      return true;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  return false;
}

/**
 * Выполняет транзакцию с автоматическим retry при временных ошибках.
 *
 * @example
 * ```typescript
 * const result = await safeTransaction(this.prisma, async (tx) => {
 *   const user = await tx.user.create({ data: { ... } });
 *   const profile = await tx.profile.create({ data: { userId: user.id, ... } });
 *   return { user, profile };
 * });
 * ```
 */
export async function safeTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: SafeTransactionOptions = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    isolationLevel,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await prisma.$transaction(fn, {
        maxWait: maxWaitMs,
        timeout: timeoutMs,
        isolationLevel,
      });

      // Успех
      if (attempt > 1) {
        logger.log(`Transaction succeeded on attempt ${attempt}/${maxRetries}`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      const isRetryable = isRetryableError(error);
      const hasRetriesLeft = attempt < maxRetries;

      if (isRetryable && hasRetriesLeft) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        const errorCode =
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : 'CONNECTION_ERROR';

        logger.warn(
          `Transaction failed with ${errorCode}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Не временная ошибка или исчерпаны попытки
      if (!isRetryable) {
        logger.debug(`Transaction failed with non-retryable error: ${(error as Error).message}`);
      } else {
        logger.error(
          `Transaction failed after ${maxRetries} attempts: ${(error as Error).message}`,
        );
      }

      throw error;
    }
  }

  // Не должны сюда попасть, но на всякий случай
  throw lastError;
}

/**
 * Декоратор для методов сервисов, которые должны выполняться в безопасной транзакции.
 *
 * @example
 * ```typescript
 * @SafeTransactionMethod()
 * async createUserWithProfile(data: CreateUserDto) {
 *   return this.prisma.$transaction(async (tx) => {
 *     // ...
 *   });
 * }
 * ```
 */
export function SafeTransactionMethod(options: SafeTransactionOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
      const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          const isRetryable = isRetryableError(error);
          const hasRetriesLeft = attempt < maxRetries;

          if (isRetryable && hasRetriesLeft) {
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            logger.warn(
              `${target.constructor.name}.${propertyKey} failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw error;
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
