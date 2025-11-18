import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ClientActivityService {
  private readonly logger = new Logger(ClientActivityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Автодеактивация клиентов, неактивных более 6 месяцев
   * Запускается каждую ночь в 3:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'deactivate-inactive-clients',
  })
  async deactivateInactiveClients() {
    this.logger.log('Starting auto-deactivation of inactive clients...');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    try {
      const result = await this.prisma.client.updateMany({
        where: {
          status: 'ACTIVE',
          OR: [
            {
              // Клиенты с lastActivityAt старше 6 месяцев
              lastActivityAt: {
                lt: sixMonthsAgo,
              },
            },
            {
              // Клиенты без lastActivityAt, но созданные более 6 месяцев назад
              lastActivityAt: null,
              createdAt: {
                lt: sixMonthsAgo,
              },
            },
          ],
        },
        data: {
          status: 'INACTIVE',
        },
      });

      this.logger.log(
        `Auto-deactivation completed. Deactivated ${result.count} clients.`,
      );
    } catch (error) {
      this.logger.error('Error during auto-deactivation:', error);
    }
  }

  /**
   * Обновление lastActivityAt для клиента
   */
  async updateClientActivity(clientId: string) {
    try {
      await this.prisma.client.update({
        where: { id: clientId },
        data: { lastActivityAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Error updating activity for client ${clientId}:`,
        error,
      );
    }
  }

  /**
   * Автоматическая реактивация клиента при новой активности
   */
  async reactivateClientIfNeeded(clientId: string) {
    try {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: { status: true },
      });

      if (client && client.status === 'INACTIVE') {
        await this.prisma.client.update({
          where: { id: clientId },
          data: {
            status: 'ACTIVE',
            lastActivityAt: new Date(),
          },
        });

        this.logger.log(`Client ${clientId} auto-reactivated due to new activity`);
      } else {
        await this.updateClientActivity(clientId);
      }
    } catch (error) {
      this.logger.error(
        `Error reactivating client ${clientId}:`,
        error,
      );
    }
  }
}
