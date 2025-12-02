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
   * Liveness probe - проверяет только что приложение запущено
   * Используется Kubernetes для определения нужен ли restart
   */
  @Public()
  @Get('liveness')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
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
}
