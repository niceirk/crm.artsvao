import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimepadService } from '../integrations/timepad/timepad.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  EventParticipantStatus,
  EventRegistrationSource,
  AuditAction,
  CalendarEventStatus,
} from '@prisma/client';
import { CreateEventParticipantDto, EventParticipantQueryDto } from './dto';

export interface EventAvailability {
  maxCapacity: number | null;
  timepadRegistrations: number;
  crmRegistrations: number;
  totalRegistrations: number;
  available: number | null; // null если нет лимита
  hasLimit: boolean;
}

@Injectable()
export class EventParticipantsService {
  private readonly logger = new Logger(EventParticipantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timepadService: TimepadService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Проверка доступности мест на мероприятии
   * Формула: available = maxCapacity - timepadRegistrations - crmRegistrations
   */
  async checkAvailability(eventId: string): Promise<EventAvailability> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        maxCapacity: true,
        timepadLink: true,
        status: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Мероприятие с ID ${eventId} не найдено`);
    }

    // Подсчет регистраций в CRM
    const crmRegistrations = await this.prisma.eventParticipant.count({
      where: {
        eventId,
        status: { in: [EventParticipantStatus.REGISTERED, EventParticipantStatus.CONFIRMED] },
      },
    });

    // Подсчет регистраций в Timepad
    let timepadRegistrations = 0;
    if (event.timepadLink) {
      try {
        const timepadEventId = this.timepadService.extractEventId(event.timepadLink);
        if (timepadEventId) {
          const ordersResponse = await this.timepadService.getEventOrders(timepadEventId, { limit: 500 });
          // Считаем только подтвержденные заказы
          for (const order of ordersResponse.values || []) {
            const status = order.status?.name?.toLowerCase();
            if (status === 'ok' || status === 'paid') {
              timepadRegistrations += order.tickets?.length || 1;
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Не удалось получить данные Timepad для события ${eventId}: ${error.message}`);
        // Продолжаем без данных Timepad
      }
    }

    const totalRegistrations = crmRegistrations + timepadRegistrations;
    const hasLimit = event.maxCapacity !== null && event.maxCapacity > 0;
    const available = hasLimit ? Math.max(0, event.maxCapacity! - totalRegistrations) : null;

    return {
      maxCapacity: event.maxCapacity,
      timepadRegistrations,
      crmRegistrations,
      totalRegistrations,
      available,
      hasLimit,
    };
  }

  /**
   * Регистрация участника на мероприятие
   */
  async registerParticipant(
    dto: CreateEventParticipantDto,
    userId?: string,
  ) {
    const { eventId, clientId, source, telegramChatId, notes } = dto;

    // Проверка существования мероприятия
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        date: true,
        startTime: true,
        endTime: true,
        maxCapacity: true,
        status: true,
        room: { select: { name: true } },
      },
    });

    if (!event) {
      throw new NotFoundException(`Мероприятие с ID ${eventId} не найдено`);
    }

    // Проверка что мероприятие не отменено/завершено
    if (event.status === CalendarEventStatus.CANCELLED) {
      throw new BadRequestException('Мероприятие отменено');
    }

    if (event.status === CalendarEventStatus.COMPLETED) {
      throw new BadRequestException('Мероприятие уже завершено');
    }

    // Проверка существования клиента
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, status: true },
    });

    if (!client) {
      throw new NotFoundException(`Клиент с ID ${clientId} не найден`);
    }

    // Проверка что клиент еще не зарегистрирован
    const existingParticipant = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_clientId: { eventId, clientId },
      },
    });

    if (existingParticipant) {
      if (existingParticipant.status === EventParticipantStatus.CANCELLED) {
        // Если была отменена - восстанавливаем регистрацию
        const restored = await this.prisma.eventParticipant.update({
          where: { id: existingParticipant.id },
          data: {
            status: EventParticipantStatus.REGISTERED,
            registeredAt: new Date(),
            cancelledAt: null,
            source,
            telegramChatId: telegramChatId ? BigInt(telegramChatId) : null,
            notes,
          },
          include: {
            event: { select: { name: true, date: true, startTime: true, room: { select: { name: true } } } },
            client: { select: { firstName: true, lastName: true } },
          },
        });

        this.logger.log(`Восстановлена регистрация клиента ${clientId} на событие ${eventId}`);
        return restored;
      }

      throw new ConflictException('Клиент уже зарегистрирован на это мероприятие');
    }

    // Проверка доступности мест
    const availability = await this.checkAvailability(eventId);
    if (availability.hasLimit && availability.available !== null && availability.available <= 0) {
      throw new BadRequestException('На мероприятии нет свободных мест');
    }

    // Создание регистрации
    const participant = await this.prisma.eventParticipant.create({
      data: {
        eventId,
        clientId,
        source,
        telegramChatId: telegramChatId ? BigInt(telegramChatId) : null,
        notes,
      },
      include: {
        event: { select: { name: true, date: true, startTime: true, room: { select: { name: true } } } },
        client: { select: { firstName: true, lastName: true } },
      },
    });

    // Логирование в AuditLog
    if (userId) {
      await this.auditLogService.log({
        userId,
        action: AuditAction.CREATE,
        entityType: 'EventParticipant',
        entityId: participant.id,
        changes: {
          eventId,
          clientId,
          source,
        },
      });
    }

    this.logger.log(`Зарегистрирован участник ${clientId} на событие ${eventId} через ${source}`);

    return participant;
  }

  /**
   * Получение списка участников мероприятия
   */
  async getEventParticipants(eventId: string, query: EventParticipantQueryDto = {}) {
    const { status, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // Проверка существования мероприятия
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`Мероприятие с ID ${eventId} не найдено`);
    }

    const where = {
      eventId,
      ...(status && { status }),
    };

    const [participants, total] = await Promise.all([
      this.prisma.eventParticipant.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              phone: true,
              email: true,
              dateOfBirth: true,
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.eventParticipant.count({ where }),
    ]);

    return {
      data: participants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получение регистрации по ID
   */
  async getParticipant(participantId: string) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: { id: participantId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            date: true,
            startTime: true,
            endTime: true,
            room: { select: { name: true } },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException(`Регистрация с ID ${participantId} не найдена`);
    }

    return participant;
  }

  /**
   * Отмена регистрации
   */
  async cancelRegistration(eventId: string, clientId: string, userId?: string) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_clientId: { eventId, clientId },
      },
    });

    if (!participant) {
      throw new NotFoundException('Регистрация не найдена');
    }

    if (participant.status === EventParticipantStatus.CANCELLED) {
      throw new BadRequestException('Регистрация уже отменена');
    }

    const updated = await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        status: EventParticipantStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        event: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    });

    if (userId) {
      await this.auditLogService.log({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'EventParticipant',
        entityId: participant.id,
        changes: {
          status: { from: participant.status, to: EventParticipantStatus.CANCELLED },
        },
      });
    }

    this.logger.log(`Отменена регистрация клиента ${clientId} на событие ${eventId}`);

    return updated;
  }

  /**
   * Подтверждение присутствия на мероприятии
   */
  async confirmAttendance(eventId: string, clientId: string, userId?: string) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_clientId: { eventId, clientId },
      },
    });

    if (!participant) {
      throw new NotFoundException('Регистрация не найдена');
    }

    if (participant.status === EventParticipantStatus.CANCELLED) {
      throw new BadRequestException('Регистрация отменена');
    }

    if (participant.status === EventParticipantStatus.CONFIRMED) {
      throw new BadRequestException('Присутствие уже подтверждено');
    }

    const updated = await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        status: EventParticipantStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      include: {
        event: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    });

    if (userId) {
      await this.auditLogService.log({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'EventParticipant',
        entityId: participant.id,
        changes: {
          status: { from: participant.status, to: EventParticipantStatus.CONFIRMED },
        },
      });
    }

    this.logger.log(`Подтверждено присутствие клиента ${clientId} на событии ${eventId}`);

    return updated;
  }

  /**
   * Отметка неявки
   */
  async markNoShow(eventId: string, clientId: string, userId?: string) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: {
        eventId_clientId: { eventId, clientId },
      },
    });

    if (!participant) {
      throw new NotFoundException('Регистрация не найдена');
    }

    const updated = await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        status: EventParticipantStatus.NO_SHOW,
      },
      include: {
        event: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    });

    if (userId) {
      await this.auditLogService.log({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'EventParticipant',
        entityId: participant.id,
        changes: {
          status: { from: participant.status, to: EventParticipantStatus.NO_SHOW },
        },
      });
    }

    return updated;
  }

  /**
   * Получение участников для отправки напоминаний
   * (события на завтра, напоминание еще не отправлено)
   */
  async getParticipantsForReminder() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    return this.prisma.eventParticipant.findMany({
      where: {
        status: EventParticipantStatus.REGISTERED,
        reminderSentAt: null,
        event: {
          date: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
          status: { in: [CalendarEventStatus.PLANNED, CalendarEventStatus.ONGOING] },
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
            room: { select: { name: true } },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            telegramAccounts: {
              where: { isNotificationsEnabled: true },
              select: { chatId: true },
            },
          },
        },
      },
    });
  }

  /**
   * Отметка об отправке напоминания
   */
  async markReminderSent(participantId: string) {
    return this.prisma.eventParticipant.update({
      where: { id: participantId },
      data: { reminderSentAt: new Date() },
    });
  }
}
