import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Коды ошибок Prisma, связанные с соединением (временные, можно retry)
 */
const CONNECTION_ERROR_CODES = ['P1001', 'P1002', 'P1008', 'P2024'];

/**
 * PostgreSQL native error codes (SqlState), связанные с соединением
 */
const CONNECTION_SQL_STATES = ['57P01', '57P02', '57P03', '57P05', '08006', '08003'];

/**
 * Коды ошибок Prisma, связанные с ограничениями БД
 */
const CONSTRAINT_ERROR_CODES = ['P2002', 'P2003', 'P2025'];

/**
 * Глобальный фильтр для перехвата и обработки ошибок Prisma.
 * Преобразует технические ошибки БД в понятные HTTP ответы.
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError
      | Prisma.PrismaClientInitializationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ошибка базы данных';
    let code = 'DATABASE_ERROR';
    let isRetryable = false;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const result = this.handleKnownError(exception);
      status = result.status;
      message = result.message;
      code = result.code;
      isRetryable = result.isRetryable;
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      const result = this.handleUnknownError(exception);
      status = result.status;
      message = result.message;
      code = result.code;
      isRetryable = result.isRetryable;
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'База данных недоступна. Попробуйте позже.';
      code = 'DATABASE_UNAVAILABLE';
      isRetryable = true;
    }

    // Логируем ошибку с контекстом
    const logContext = {
      path: request.url,
      method: request.method,
      code,
      isRetryable,
      prismaCode: exception instanceof Prisma.PrismaClientKnownRequestError ? exception.code : undefined,
    };

    if (isRetryable || status >= 500) {
      this.logger.error(
        `Prisma error: ${message}`,
        exception.stack,
        JSON.stringify(logContext),
      );
    } else {
      this.logger.warn(`Prisma error: ${message}`, JSON.stringify(logContext));
    }

    response.status(status).json({
      statusCode: status,
      message,
      code,
      isRetryable,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handleKnownError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    code: string;
    isRetryable: boolean;
  } {
    const prismaCode = exception.code;

    // Ошибки соединения (временные)
    if (CONNECTION_ERROR_CODES.includes(prismaCode)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'База данных временно недоступна. Попробуйте через несколько секунд.',
        code: 'DATABASE_CONNECTION_ERROR',
        isRetryable: true,
      };
    }

    // Уникальное ограничение
    if (prismaCode === 'P2002') {
      const target = exception.meta?.target as string[] | undefined;
      const field = target?.[0] || 'поле';
      return {
        status: HttpStatus.CONFLICT,
        message: `Запись с таким значением ${field} уже существует`,
        code: 'DUPLICATE_ENTRY',
        isRetryable: false,
      };
    }

    // Нарушение foreign key
    if (prismaCode === 'P2003') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Невозможно выполнить операцию: связанная запись не найдена',
        code: 'FOREIGN_KEY_VIOLATION',
        isRetryable: false,
      };
    }

    // Запись не найдена
    if (prismaCode === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Запись не найдена',
        code: 'RECORD_NOT_FOUND',
        isRetryable: false,
      };
    }

    // Ограничение check
    if (prismaCode === 'P2004') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Данные не соответствуют ограничениям',
        code: 'CHECK_CONSTRAINT_VIOLATION',
        isRetryable: false,
      };
    }

    // Transaction timeout
    if (prismaCode === 'P2028') {
      return {
        status: HttpStatus.GATEWAY_TIMEOUT,
        message: 'Операция заняла слишком много времени. Попробуйте снова.',
        code: 'TRANSACTION_TIMEOUT',
        isRetryable: true,
      };
    }

    // Default для known errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка базы данных',
      code: `PRISMA_${prismaCode}`,
      isRetryable: false,
    };
  }

  private handleUnknownError(exception: Prisma.PrismaClientUnknownRequestError): {
    status: number;
    message: string;
    code: string;
    isRetryable: boolean;
  } {
    const message = exception.message;

    // Проверяем PostgreSQL native error codes
    for (const sqlState of CONNECTION_SQL_STATES) {
      if (message.includes(sqlState)) {
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'База данных временно недоступна. Попробуйте через несколько секунд.',
          code: 'DATABASE_CONNECTION_ERROR',
          isRetryable: true,
        };
      }
    }

    // Проверяем текст ошибки на connection problems
    if (
      message.includes('idle-session timeout') ||
      message.includes('idle_session_timeout') ||
      message.includes('ECONNRESET') ||
      message.includes('EPIPE') ||
      message.includes('connection')
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Соединение с базой данных прервано. Попробуйте снова.',
        code: 'DATABASE_CONNECTION_LOST',
        isRetryable: true,
      };
    }

    // Default для unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Неизвестная ошибка базы данных',
      code: 'DATABASE_UNKNOWN_ERROR',
      isRetryable: false,
    };
  }
}
