import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * Отправить уведомление о напоминании о занятии
   */
  async sendScheduleReminder(scheduleId: string): Promise<void> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        group: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: {
                client: {
                  include: {
                    telegramAccounts: {
                      where: { isNotificationsEnabled: true },
                    },
                  },
                },
              },
            },
          },
        },
        room: true,
      },
    });

    if (!schedule) {
      this.logger.warn(`Schedule ${scheduleId} not found`);
      return;
    }

    const template = await this.getTemplate('SCHEDULE_REMINDER');
    if (!template) {
      this.logger.warn('Template SCHEDULE_REMINDER not found');
      return;
    }

    // Отправляем уведомления всем активным участникам группы
    for (const member of schedule.group.members) {
      const client = member.client;

      // Пропускаем клиентов без Telegram
      if (!client.telegramAccounts || client.telegramAccounts.length === 0) {
        continue;
      }

      const data = {
        clientName: `${client.firstName} ${client.lastName}`,
        groupName: schedule.group.name,
        scheduleDate: this.formatDate(schedule.date),
        scheduleTime: this.formatTime(schedule.startTime),
        roomName: schedule.room?.name || 'не указан',
        duration: this.calculateDuration(schedule.startTime, schedule.endTime),
      };

      const message = this.renderTemplate(template.templateText, data);

      // Отправляем уведомление на каждый Telegram аккаунт
      for (const telegramAccount of client.telegramAccounts) {
        try {
          await this.telegramService.sendMessage(
            telegramAccount.chatId,
            message,
          );
          this.logger.log(
            `Schedule reminder sent to client ${client.id} via Telegram ${telegramAccount.telegramUserId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send schedule reminder to ${telegramAccount.telegramUserId}: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Отправить уведомление о покупке абонемента
   */
  async sendSubscriptionPurchaseConfirmation(subscriptionId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        client: {
          include: {
            telegramAccounts: {
              where: { isNotificationsEnabled: true },
            },
          },
        },
        group: true,
        subscriptionType: true,
      },
    });

    if (!subscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found`);
      return;
    }

    const template = await this.getTemplate('SUBSCRIPTION_PURCHASED');
    if (!template) {
      this.logger.warn('Template SUBSCRIPTION_PURCHASED not found');
      return;
    }

    const client = subscription.client;

    // Пропускаем клиентов без Telegram
    if (!client.telegramAccounts || client.telegramAccounts.length === 0) {
      this.logger.log(
        `Client ${client.id} has no Telegram accounts, skipping notification`,
      );
      return;
    }

    const data = {
      clientName: `${client.firstName} ${client.lastName}`,
      subscriptionType: subscription.subscriptionType.name,
      groupName: subscription.group?.name || 'не указана',
      startDate: this.formatDate(subscription.startDate),
      endDate: this.formatDate(subscription.endDate),
      remainingVisits: subscription.remainingVisits?.toString() || 'не ограничено',
    };

    const message = this.renderTemplate(template.templateText, data);

    // Отправляем уведомление на каждый Telegram аккаунт
    for (const telegramAccount of client.telegramAccounts) {
      try {
        await this.telegramService.sendMessage(
          telegramAccount.chatId,
          message,
        );
        this.logger.log(
          `Subscription confirmation sent to client ${client.id} via Telegram ${telegramAccount.telegramUserId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send subscription confirmation to ${telegramAccount.telegramUserId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Отправить уведомление об изменении расписания
   */
  async sendScheduleChangeNotification(scheduleId: string): Promise<void> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        group: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
              include: {
                client: {
                  include: {
                    telegramAccounts: {
                      where: { isNotificationsEnabled: true },
                    },
                  },
                },
              },
            },
          },
        },
        room: true,
      },
    });

    if (!schedule) {
      this.logger.warn(`Schedule ${scheduleId} not found`);
      return;
    }

    const template = await this.getTemplate('SCHEDULE_CHANGED');
    if (!template) {
      this.logger.warn('Template SCHEDULE_CHANGED not found');
      return;
    }

    // Отправляем уведомления всем активным участникам группы
    for (const member of schedule.group.members) {
      const client = member.client;

      if (!client.telegramAccounts || client.telegramAccounts.length === 0) {
        continue;
      }

      const data = {
        clientName: `${client.firstName} ${client.lastName}`,
        groupName: schedule.group.name,
        scheduleDate: this.formatDate(schedule.date),
        scheduleTime: this.formatTime(schedule.startTime),
        roomName: schedule.room?.name || 'не указан',
      };

      const message = this.renderTemplate(template.templateText, data);

      for (const telegramAccount of client.telegramAccounts) {
        try {
          await this.telegramService.sendMessage(
            telegramAccount.chatId,
            message,
          );
          this.logger.log(
            `Schedule change notification sent to client ${client.id} via Telegram ${telegramAccount.telegramUserId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send schedule change notification to ${telegramAccount.telegramUserId}: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Отправить уведомление о получении оплаты
   */
  async sendPaymentConfirmation(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            client: {
              include: {
                telegramAccounts: {
                  where: { isNotificationsEnabled: true },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found`);
      return;
    }

    const template = await this.getTemplate('PAYMENT_RECEIVED');
    if (!template) {
      this.logger.warn('Template PAYMENT_RECEIVED not found');
      return;
    }

    const client = payment.invoice.client;

    if (!client.telegramAccounts || client.telegramAccounts.length === 0) {
      this.logger.log(
        `Client ${client.id} has no Telegram accounts, skipping notification`,
      );
      return;
    }

    const data = {
      clientName: `${client.firstName} ${client.lastName}`,
      amount: payment.amount.toString(),
      paymentDate: this.formatDate(payment.createdAt),
      paymentMethod: this.translatePaymentMethod(payment.paymentMethod),
    };

    const message = this.renderTemplate(template.templateText, data);

    for (const telegramAccount of client.telegramAccounts) {
      try {
        await this.telegramService.sendMessage(
          telegramAccount.chatId,
          message,
        );
        this.logger.log(
          `Payment confirmation sent to client ${client.id} via Telegram ${telegramAccount.telegramUserId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send payment confirmation to ${telegramAccount.telegramUserId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Получить шаблон уведомления по типу события
   */
  private async getTemplate(eventType: string) {
    return this.prisma.notificationTemplate.findFirst({
      where: { eventType, isActive: true },
    });
  }

  /**
   * Отрендерить шаблон с данными
   */
  private renderTemplate(template: string, data: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Форматировать дату
   * Используем UTC дату без учета часового пояса
   */
  private formatDate(date: Date): string {
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Форматировать время
   * Для полей типа Time в БД используем UTC без учета часового пояса
   */
  private formatTime(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Вычислить длительность в минутах
   */
  private calculateDuration(startTime: Date, endTime: Date): string {
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} минут`;
  }

  /**
   * Перевести метод оплаты
   */
  private translatePaymentMethod(method: string): string {
    const translations: Record<string, string> = {
      CASH: 'Наличные',
      CARD: 'Карта',
      BANK_TRANSFER: 'Банковский перевод',
      ONLINE: 'Онлайн',
    };
    return translations[method] || method;
  }
}
