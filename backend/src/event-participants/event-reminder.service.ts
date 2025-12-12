import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { Inject, forwardRef } from '@nestjs/common';
import { EventParticipantStatus } from '@prisma/client';

@Injectable()
export class EventReminderService implements OnModuleInit {
  private readonly logger = new Logger(EventReminderService.name);
  private reminderInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
  ) {}

  onModuleInit() {
    // Запускаем проверку каждый час
    this.reminderInterval = setInterval(
      () => this.checkAndSendReminders(),
      60 * 60 * 1000, // 1 час
    );

    // Первая проверка через 1 минуту после запуска
    setTimeout(() => this.checkAndSendReminders(), 60 * 1000);

    this.logger.log('Event reminder service initialized');
  }

  onModuleDestroy() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }
  }

  /**
   * Проверяет и отправляет напоминания за день до мероприятия
   */
  async checkAndSendReminders() {
    try {
      this.logger.log('Checking for event reminders...');

      // Находим мероприятия на завтра
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Получаем участников с несент reminder'ом для завтрашних мероприятий
      const participants = await this.prisma.eventParticipant.findMany({
        where: {
          status: {
            in: [EventParticipantStatus.REGISTERED, EventParticipantStatus.CONFIRMED],
          },
          reminderSentAt: null,
          telegramChatId: { not: null },
          event: {
            date: {
              gte: tomorrow,
              lt: dayAfterTomorrow,
            },
          },
        },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              date: true,
              startTime: true,
              endTime: true,
              room: {
                select: {
                  name: true,
                  number: true,
                },
              },
            },
          },
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      this.logger.log(`Found ${participants.length} participants to remind`);

      for (const participant of participants) {
        try {
          await this.sendReminder(participant);
        } catch (error) {
          this.logger.error(
            `Failed to send reminder to participant ${participant.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error checking reminders: ${error.message}`);
    }
  }

  /**
   * Отправляет напоминание участнику
   */
  private async sendReminder(participant: {
    id: string;
    telegramChatId: bigint | null;
    event: {
      id: string;
      name: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      room: { name: string; number: string | null } | null;
    };
    client: {
      firstName: string | null;
      lastName: string | null;
    };
  }) {
    if (!participant.telegramChatId) {
      return;
    }

    const chatId = Number(participant.telegramChatId);
    const event = participant.event;
    const client = participant.client;

    // Форматируем дату
    const dateStr = event.date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Форматируем время
    const startTime = event.startTime.toISOString().substring(11, 16);
    const endTime = event.endTime.toISOString().substring(11, 16);

    // Формируем место проведения
    let location = 'Арт-пространство "Артсвао"';
    if (event.room) {
      location = event.room.number
        ? `${event.room.name}, каб. ${event.room.number}`
        : event.room.name;
    }

    const clientName = [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Участник';

    const message =
      `🔔 <b>Напоминание о мероприятии!</b>\n\n` +
      `Завтра состоится мероприятие, на которое вы зарегистрированы:\n\n` +
      `🎭 <b>${event.name}</b>\n` +
      `👤 ${clientName}\n` +
      `📅 ${dateStr}\n` +
      `⏰ ${startTime} - ${endTime}\n` +
      `📍 ${location}\n\n` +
      `Ждём вас! До встречи! 🎉`;

    try {
      await this.telegramService.sendMessage(chatId, message, { parse_mode: 'HTML' } as any);

      // Помечаем напоминание как отправленное
      await this.prisma.eventParticipant.update({
        where: { id: participant.id },
        data: { reminderSentAt: new Date() },
      });

      this.logger.log(`Reminder sent to participant ${participant.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram message to chat ${chatId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Принудительная отправка напоминаний (для тестирования или ручного запуска)
   */
  async forceCheckReminders() {
    await this.checkAndSendReminders();
    return { message: 'Reminder check completed' };
  }
}
