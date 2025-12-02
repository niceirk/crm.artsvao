import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { retryExtension } from './prisma-retry.extension';

const SLOW_QUERY_THRESHOLD_MS = 1000;
const MAX_CONNECT_RETRIES = 5;
const CONNECT_RETRY_BASE_DELAY_MS = 2000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
            ]
          : [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'error' }],
    });

    this.setupQueryLogging();
  }

  /**
   * Настройка логирования медленных запросов
   */
  private setupQueryLogging() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.$on as any)('query', (e: Prisma.QueryEvent) => {
      if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 200)}${e.query.length > 200 ? '...' : ''}`,
        );
      } else if (process.env.NODE_ENV === 'development' && e.duration > 100) {
        // В development логируем запросы > 100ms для отладки
        this.logger.debug(`Query (${e.duration}ms): ${e.query.substring(0, 100)}...`);
      }
    });
  }

  /**
   * Подключение к БД с retry логикой при старте
   */
  async onModuleInit() {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log(
          `Database connected successfully (attempt ${attempt}/${MAX_CONNECT_RETRIES})`,
        );
        return;
      } catch (error) {
        lastError = error as Error;
        const delay = CONNECT_RETRY_BASE_DELAY_MS * attempt;

        if (attempt < MAX_CONNECT_RETRIES) {
          this.logger.warn(
            `Database connection attempt ${attempt}/${MAX_CONNECT_RETRIES} failed: ${(error as Error).message}. ` +
              `Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `Failed to connect to database after ${MAX_CONNECT_RETRIES} attempts`,
      lastError?.stack,
    );
    throw lastError;
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Проверка здоровья БД с таймаутом
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await Promise.race([
        this.$queryRaw`SELECT 1 as health`,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000),
        ),
      ]);
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Получение расширенного клиента с retry логикой.
   * Используйте для критичных операций где важна устойчивость к временным сбоям.
   */
  get withRetry() {
    return this.$extends(retryExtension);
  }
}
