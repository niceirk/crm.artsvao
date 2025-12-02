import { Prisma } from '@prisma/client';

/**
 * Коды ошибок Prisma, при которых нужно повторить запрос:
 * P1001 - Can't reach database server
 * P1002 - Database server was reached but timed out
 * P1008 - Operations timed out
 * P2024 - Timed out fetching a new connection from the connection pool
 */
const RETRYABLE_ERROR_CODES = ['P1001', 'P1002', 'P1008', 'P2024'];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

/**
 * Prisma Client Extension для автоматического retry при временных ошибках БД.
 * Использует exponential backoff: 100ms, 200ms, 400ms
 */
export const retryExtension = Prisma.defineExtension({
  name: 'retry-extension',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error as Error;

            // Проверяем, является ли ошибка временной и можно ли повторить
            const isRetryable =
              error instanceof Prisma.PrismaClientKnownRequestError &&
              RETRYABLE_ERROR_CODES.includes(error.code);

            const hasRetriesLeft = attempt < MAX_RETRIES;

            if (isRetryable && hasRetriesLeft) {
              const delay = BASE_DELAY_MS * Math.pow(2, attempt);
              console.warn(
                `[PrismaRetry] ${model}.${operation} failed with ${(error as Prisma.PrismaClientKnownRequestError).code}, ` +
                  `retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            // Не временная ошибка или исчерпаны попытки
            throw error;
          }
        }

        // Не должны сюда попасть, но на всякий случай
        throw lastError;
      },
    },
  },
});

export type RetryExtensionClient = ReturnType<typeof retryExtension>;
