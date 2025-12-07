import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

const MEMORY_LOG_INTERVAL_MS = 30000; // Логировать память каждые 30 сек
const MEMORY_WARNING_THRESHOLD_MB = 1500; // Предупреждение при > 1.5GB

// Fix for BigInt serialization in JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// ============================================
// ГЛОБАЛЬНЫЕ ФЛАГИ SHUTDOWN ДЛЯ ДИАГНОСТИКИ
// ============================================
// Эти флаги помогают отследить РЕАЛЬНЫЙ сигнал shutdown
// и отличить его от ложного вызова onModuleDestroy
export const shutdownState = {
  signalReceived: false,
  signalName: null as string | null,
  signalTime: null as Date | null,
  nestShutdownCalled: false,
  nestShutdownTime: null as Date | null,
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS for frontend (allow all origins in development)
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter for Prisma errors
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);

  const logger = new Logger('Bootstrap');
  const startTime = new Date();

  // ============================================
  // ЛОГИРОВАНИЕ ВСЕХ СИГНАЛОВ ДЛЯ ДИАГНОСТИКИ
  // ============================================
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'];

  signals.forEach((signal) => {
    process.on(signal, () => {
      const uptime = Math.round((Date.now() - startTime.getTime()) / 1000);
      shutdownState.signalReceived = true;
      shutdownState.signalName = signal;
      shutdownState.signalTime = new Date();

      logger.warn(
        `[SIGNAL] Received ${signal} after ${uptime}s uptime. ` +
        `PID: ${process.pid}, PPID: ${process.ppid || 'unknown'}`
      );

      // Логируем stack trace для понимания откуда пришёл сигнал
      logger.warn(`[SIGNAL] Stack trace:\n${new Error().stack}`);
    });
  });

  // Логируем успешный старт
  logger.log(`[STARTUP] Application started successfully. PID: ${process.pid}, PPID: ${process.ppid || 'unknown'}`);

  // Мониторинг памяти
  let memoryLogInterval: NodeJS.Timeout | null = null;
  let peakHeapUsedMB = 0;

  const startMemoryMonitoring = () => {
    memoryLogInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);
      const externalMB = Math.round(memUsage.external / 1024 / 1024);

      // Обновляем пик
      if (heapUsedMB > peakHeapUsedMB) {
        peakHeapUsedMB = heapUsedMB;
      }

      logger.log(
        `[MEMORY] heap=${heapUsedMB}/${heapTotalMB}MB, peak=${peakHeapUsedMB}MB, rss=${rssMB}MB, external=${externalMB}MB`,
      );

      // Предупреждение при высоком использовании памяти
      if (heapUsedMB > MEMORY_WARNING_THRESHOLD_MB) {
        logger.warn(
          `[MEMORY] WARNING: High memory usage (${heapUsedMB}MB > ${MEMORY_WARNING_THRESHOLD_MB}MB threshold)!`,
        );
      }
    }, MEMORY_LOG_INTERVAL_MS);

    logger.log(`[MEMORY] Monitoring started (interval: ${MEMORY_LOG_INTERVAL_MS}ms)`);
  };

  const stopMemoryMonitoring = () => {
    if (memoryLogInterval) {
      clearInterval(memoryLogInterval);
      memoryLogInterval = null;
      logger.log(`[MEMORY] Monitoring stopped. Peak heap: ${peakHeapUsedMB}MB`);
    }
  };

  // Запускаем мониторинг памяти
  startMemoryMonitoring();

  // Graceful shutdown управляется NestJS через enableShutdownHooks()
  // Мы добавляем ДОПОЛНИТЕЛЬНЫЕ обработчики для ЛОГИРОВАНИЯ (не для shutdown)
  // PrismaService.onModuleDestroy проверяет shutdownState для защиты от ложного shutdown

  // Handle uncaught exceptions - критические ошибки
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    stopMemoryMonitoring();
    process.exit(1);
  });

  // Handle unhandled promise rejections - логируем но не крашим
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  });
}
bootstrap();
