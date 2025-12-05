import { Prisma } from '@prisma/client';

/**
 * Коды ошибок Prisma, при которых нужно повторить запрос:
 * P1001 - Can't reach database server
 * P1002 - Database server was reached but timed out
 * P1008 - Operations timed out
 * P1017 - Server has closed the connection
 * P2024 - Timed out fetching a new connection from the connection pool
 */
const RETRYABLE_ERROR_CODES = ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'];

/**
 * PostgreSQL native error codes (SqlState), при которых нужно повторить запрос:
 * 57P01 - admin_shutdown
 * 57P02 - crash_shutdown
 * 57P03 - cannot_connect_now
 * 57P05 - idle_session_timeout (главная проблема с облачными БД)
 * 08006 - connection_failure
 * 08003 - connection_does_not_exist
 */
const RETRYABLE_SQL_STATES = ['57P01', '57P02', '57P03', '57P05', '08006', '08003'];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

/**
 * Проверяет, является ли ошибка временной и можно ли повторить запрос
 */
function isRetryableError(error: unknown): boolean {
  // Проверка Prisma known errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    RETRYABLE_ERROR_CODES.includes(error.code)
  ) {
    return true;
  }

  // Проверка PostgreSQL native errors (приходят как UnknownRequestError)
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const message = error.message;
    if (RETRYABLE_SQL_STATES.some((state) => message.includes(state))) {
      return true;
    }
    // Дополнительные проверки по тексту ошибки
    if (
      message.includes('idle-session timeout') ||
      message.includes('connection') ||
      message.includes('ECONNRESET') ||
      message.includes('EPIPE') ||
      message.includes('Server has closed')
    ) {
      return true;
    }
  }

  // Проверка ошибок инициализации клиента
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  return false;
}

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

            const hasRetriesLeft = attempt < MAX_RETRIES;

            if (isRetryableError(error) && hasRetriesLeft) {
              const delay = BASE_DELAY_MS * Math.pow(2, attempt);
              const errorCode =
                error instanceof Prisma.PrismaClientKnownRequestError
                  ? error.code
                  : 'CONNECTION_ERROR';
              console.warn(
                `[PrismaRetry] ${model}.${operation} failed with ${errorCode}, ` +
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
