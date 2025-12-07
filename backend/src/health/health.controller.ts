import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Полная проверка здоровья приложения включая БД
   * Возвращает 503 если БД недоступна
   */
  @Public()
  @Get()
  async check(@Res() res: Response) {
    const dbHealthy = await this.prisma.healthCheck();

    const response = {
      status: dbHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbHealthy ? 'up' : 'down',
        },
      },
    };

    const statusCode = dbHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(response);
  }

  /**
   * Liveness probe - проверяет только что приложение запущено и не в shutdown
   * Используется Kubernetes/Docker для определения нужен ли restart
   */
  @Public()
  @Get('liveness')
  liveness(@Res() res: Response) {
    const stats = this.prisma.getConnectionStats();

    // Если приложение в процессе shutdown - возвращаем 503
    if (stats.isShuttingDown) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'shutting_down',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(HttpStatus.OK).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Readiness probe - проверяет готовность приложения обрабатывать запросы
   * Используется Kubernetes/балансировщиком для маршрутизации трафика
   */
  @Public()
  @Get('readiness')
  async readiness(@Res() res: Response) {
    const dbHealthy = await this.prisma.healthCheck();

    const response = {
      status: dbHealthy ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
    };

    const statusCode = dbHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(response);
  }

  /**
   * Детальная диагностика соединения с БД
   * Возвращает статистику keepalive, ошибок и метрики соединения
   */
  @Public()
  @Get('detailed')
  async detailed(@Res() res: Response) {
    const dbHealthy = await this.prisma.healthCheck();
    const stats = this.prisma.getConnectionStats();

    const response = {
      status: dbHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      uptime: Math.round(process.uptime()),
      database: {
        status: dbHealthy ? 'up' : 'down',
        keepalive: {
          running: stats.keepaliveRunning,
          pings: stats.keepalivePingCount,
          fails: stats.keepaliveFailCount,
          lastSuccessfulPing: stats.lastSuccessfulPing,
        },
        connection: {
          isReconnecting: stats.isReconnecting,
          isShuttingDown: stats.isShuttingDown,
          errorCount: stats.connectionErrorCount,
          idleTimeMs: stats.idleTimeMs,
          lastActivity: stats.lastActivityTimestamp,
        },
      },
      memory: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };

    const statusCode = dbHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(response);
  }
}
