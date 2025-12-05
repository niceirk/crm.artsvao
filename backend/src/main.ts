import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

const SHUTDOWN_TIMEOUT_MS = 30000; // 30 секунд на graceful shutdown
const MEMORY_LOG_INTERVAL_MS = 30000; // Логировать память каждые 30 сек
const MEMORY_WARNING_THRESHOLD_MB = 1500; // Предупреждение при > 1.5GB

// Fix for BigInt serialization in JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
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

  // Graceful shutdown handlers with timeout
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }
    isShuttingDown = true;

    logger.warn(`Received ${signal}, starting graceful shutdown...`);

    // Останавливаем мониторинг памяти
    stopMemoryMonitoring();

    // Set a timeout to force exit if shutdown takes too long
    const shutdownTimeout = setTimeout(() => {
      logger.error(`Shutdown timeout after ${SHUTDOWN_TIMEOUT_MS}ms, forcing exit`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await app.close();
      clearTimeout(shutdownTimeout);
      logger.log('Application closed gracefully');
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimeout);
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    // Don't exit on unhandled rejections, just log
  });
}
bootstrap();
