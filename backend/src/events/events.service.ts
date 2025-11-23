import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SyncResult } from './dto/sync-events.dto';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { EmailService } from '../email/email.service';
import { PyrusService } from '../integrations/pyrus/pyrus.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
    private emailService: EmailService,
    @Inject(forwardRef(() => PyrusService))
    private pyrusService: PyrusService,
  ) {}

  async create(createEventDto: CreateEventDto) {
    // Verify room exists
    const room = await this.prisma.room.findUnique({
      where: { id: createEventDto.roomId },
    });
    if (!room) {
      throw new BadRequestException(`Room with ID ${createEventDto.roomId} not found`);
    }

    // Verify event type exists if provided
    if (createEventDto.eventTypeId) {
      const eventType = await this.prisma.eventType.findUnique({
        where: { id: createEventDto.eventTypeId },
      });
      if (!eventType) {
        throw new BadRequestException(`Event type with ID ${createEventDto.eventTypeId} not found`);
      }
    }

    // Verify responsible user exists if provided
    if (createEventDto.responsibleUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createEventDto.responsibleUserId },
      });
      if (!user) {
        throw new BadRequestException(`User with ID ${createEventDto.responsibleUserId} not found`);
      }
    }

    // Check for conflicts
    await this.conflictChecker.checkConflicts({
      date: createEventDto.date,
      startTime: createEventDto.startTime,
      endTime: createEventDto.endTime,
      roomIds: [createEventDto.roomId],
    });

    // Convert date and time strings to Date objects using UTC
    const [startHour, startMin] = createEventDto.startTime.split(':').map(Number);
    const [endHour, endMin] = createEventDto.endTime.split(':').map(Number);

    const createData = {
      ...createEventDto,
      date: new Date(createEventDto.date),
      startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
    };

    const event = await this.prisma.event.create({
      data: createData,
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Отправляем уведомление о новом событии
    await this.sendEventNotifications(event, 'new');

    return event;
  }

  async findAll(filters?: { date?: string; startDate?: string; endDate?: string; status?: string; eventTypeId?: string | string[] }) {
    const where: any = {};

    // Поддержка диапазона дат для недельного и месячного режима
    if (filters?.startDate && filters?.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    } else if (filters?.date) {
      // Одна дата для дневного режима
      where.date = new Date(filters.date);
    } else {
      // Если дата не передана, ограничиваем выборку последними 3 месяцами
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      where.date = {
        gte: threeMonthsAgo,
      };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.eventTypeId) {
      where.eventTypeId = Array.isArray(filters.eventTypeId)
        ? { in: filters.eventTypeId }
        : filters.eventTypeId;
    }

    // ОПТИМИЗАЦИЯ: updateCompletedEvents убран отсюда,
    // должен вызываться через cron/scheduled task, а не при каждом запросе

    return this.prisma.event.findMany({
      where,
      take: 500, // Лимит для предотвращения перегрузки
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
      },
    });
  }

  /**
   * Автоматически обновляет статус событий на COMPLETED,
   * если время их завершения уже прошло
   */
  private async updateCompletedEvents() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Текущее время в UTC для сравнения (время с начала дня в миллисекундах)
    const currentTimeOfDay = new Date(Date.UTC(1970, 0, 1, now.getHours(), now.getMinutes(), 0));

    // Найти все события со статусом PLANNED или ONGOING,
    // которые уже завершились
    const eventsToComplete = await this.prisma.event.findMany({
      where: {
        OR: [
          { status: 'PLANNED' },
          { status: 'ONGOING' },
        ],
        date: {
          lte: today,
        },
      },
    });

    // Фильтруем события, у которых прошло время окончания
    const completedEventIds = eventsToComplete
      .filter((event) => {
        const eventDate = new Date(event.date);
        const eventEndTime = new Date(event.endTime);

        // Если событие было в прошлом (не сегодня), оно завершено
        if (eventDate < today) {
          return true;
        }

        // Если событие сегодня, проверяем время окончания
        if (eventDate.getTime() === today.getTime()) {
          return eventEndTime <= currentTimeOfDay;
        }

        return false;
      })
      .map((event) => event.id);

    // Обновляем статус всех завершенных событий
    if (completedEventIds.length > 0) {
      await this.prisma.event.updateMany({
        where: {
          id: {
            in: completedEventIds,
          },
        },
        data: {
          status: 'COMPLETED',
        },
      });
    }
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const existing = await this.findOne(id); // Check if exists

    // Verify room exists if roomId provided
    if (updateEventDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: updateEventDto.roomId },
      });
      if (!room) {
        throw new BadRequestException(`Room with ID ${updateEventDto.roomId} not found`);
      }
    }

    // Verify event type exists if provided
    if (updateEventDto.eventTypeId) {
      const eventType = await this.prisma.eventType.findUnique({
        where: { id: updateEventDto.eventTypeId },
      });
      if (!eventType) {
        throw new BadRequestException(`Event type with ID ${updateEventDto.eventTypeId} not found`);
      }
    }

    // Verify responsible user exists if provided
    if (updateEventDto.responsibleUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateEventDto.responsibleUserId },
      });
      if (!user) {
        throw new BadRequestException(`User with ID ${updateEventDto.responsibleUserId} not found`);
      }
    }

    // Check for conflicts if date/time/rooms changed
    if (
      updateEventDto.date ||
      updateEventDto.startTime ||
      updateEventDto.endTime ||
      updateEventDto.roomId
    ) {
      const existingStart = this.extractTimeString(existing.startTime);
      const existingEnd = this.extractTimeString(existing.endTime);

      await this.conflictChecker.checkConflicts({
        date: updateEventDto.date || existing.date.toISOString().split('T')[0],
        startTime: updateEventDto.startTime || existingStart,
        endTime: updateEventDto.endTime || existingEnd,
        roomIds: [updateEventDto.roomId || existing.roomId],
        excludeEventId: id,
      });
    }

    // Convert date and time strings if provided
    const updateData: any = { ...updateEventDto };

    if (updateEventDto.date) {
      updateData.date = new Date(updateEventDto.date);
    }

    if (updateEventDto.startTime) {
      const [startHour, startMin] = updateEventDto.startTime.split(':').map(Number);
      updateData.startTime = new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0));
    }

    if (updateEventDto.endTime) {
      const [endHour, endMin] = updateEventDto.endTime.split(':').map(Number);
      updateData.endTime = new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0));
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        eventType: {
          select: {
            id: true,
            name: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Определяем критичные изменения для уведомления
    const changes: string[] = [];
    if (updateEventDto.date) {
      changes.push(`Дата изменена на ${updateEventDto.date}`);
    }
    if (updateEventDto.startTime) {
      changes.push(`Время начала изменено на ${updateEventDto.startTime}`);
    }
    if (updateEventDto.endTime) {
      changes.push(`Время окончания изменено на ${updateEventDto.endTime}`);
    }
    if (updateEventDto.roomId) {
      changes.push('Изменено место проведения');
    }
    if (updateEventDto.name) {
      changes.push('Изменено название события');
    }

    // Отправляем уведомление только если есть критичные изменения
    if (changes.length > 0) {
      await this.sendEventNotifications(updatedEvent, 'update', changes);
    }

    return updatedEvent;
  }

  async remove(id: string) {
    const event = await this.findOne(id); // Check if exists

    // Отправляем уведомление об отмене события перед удалением
    await this.sendEventNotifications(event, 'cancel');

    return this.prisma.event.delete({
      where: { id },
    });
  }

  /**
   * Extract time string in HH:MM format from Date object
   */
  private extractTimeString(dateTime: Date): string {
    const hours = dateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Send event notification to all active users
   */
  private async sendEventNotifications(
    event: any,
    notificationType: 'new' | 'update' | 'cancel',
    changes?: string[],
  ) {
    try {
      // Получаем всех активных пользователей
      const activeUsers = await this.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          email: {
            not: null,
          },
        },
        select: {
          email: true,
        },
      });

      if (activeUsers.length === 0) {
        this.logger.warn('No active users found to send event notifications');
        return;
      }

      const emails = activeUsers.map(user => user.email);

      // Получаем информацию о комнате
      const room = await this.prisma.room.findUnique({
        where: { id: event.roomId },
        select: { name: true, number: true },
      });

      // Формируем данные для уведомления
      const eventDate = new Date(event.date);
      const eventData = {
        eventTitle: event.name,
        eventDate: eventDate.toISOString().split('T')[0],
        location: room ? `${room.name} ${room.number}` : 'Не указано',
        organizer: event.responsibleUser
          ? `${event.responsibleUser.firstName || ''} ${event.responsibleUser.lastName || ''}`.trim()
          : undefined,
        capacity: event.maxCapacity,
        description: event.description,
        changes,
        eventUrl: `${process.env.FRONTEND_URL}/events/${event.id}`,
      };

      // Массовая отправка уведомлений
      const result = await this.emailService.sendEventNotificationBulk(
        emails,
        eventData,
        notificationType,
      );

      this.logger.log(
        `Event notification sent: ${result.success} successful, ${result.failed} failed (type: ${notificationType})`,
      );
    } catch (error) {
      this.logger.error(`Failed to send event notifications:`, error);
      // Не блокируем операцию - уведомления являются дополнительной функциональностью
    }
  }

  /**
   * Sync events with Pyrus
   */
  async syncEvents(eventIds: string[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    this.logger.log(`Starting sync for ${eventIds.length} events...`);

    // Get events to sync
    const events = await this.prisma.event.findMany({
      where: {
        id: {
          in: eventIds,
        },
      },
      select: {
        id: true,
        externalId: true,
        name: true,
      },
    });

    // Filter events that have externalId (connected to Pyrus)
    const eventsWithExternalId = events.filter(e => e.externalId);

    if (eventsWithExternalId.length === 0) {
      this.logger.warn('No events with externalId found');
      return result;
    }

    this.logger.log(`Found ${eventsWithExternalId.length} events with externalId`);

    try {
      // Get all tasks from Pyrus
      const allTasks = await this.pyrusService['getFormTasks']();

      // Create a map of externalId to task
      const tasksMap = new Map(allTasks.map(task => [task.id.toString(), task]));

      // Sync each event
      for (const event of eventsWithExternalId) {
        try {
          const pyrusTask = tasksMap.get(event.externalId);

          if (!pyrusTask) {
            result.failed++;
            result.errors.push({
              eventId: event.id,
              error: `Task with externalId ${event.externalId} not found in Pyrus`,
            });
            result.details.push({
              eventId: event.id,
              externalId: event.externalId,
              synced: false,
            });
            continue;
          }

          // Map Pyrus task to event DTO
          const eventData = await this.pyrusService['mapPyrusTaskToEvent'](pyrusTask);

          // Update event
          await this.update(event.id, eventData);

          result.success++;
          result.details.push({
            eventId: event.id,
            externalId: event.externalId,
            synced: true,
          });

          this.logger.log(`Synced event ${event.id} with Pyrus task ${event.externalId}`);
        } catch (error) {
          result.failed++;
          result.errors.push({
            eventId: event.id,
            error: error.message || 'Unknown error',
          });
          result.details.push({
            eventId: event.id,
            externalId: event.externalId,
            synced: false,
          });
          this.logger.error(`Error syncing event ${event.id}`, error.message);
        }
      }
    } catch (error) {
      this.logger.error('Error fetching tasks from Pyrus', error.message);
      throw new BadRequestException('Failed to fetch tasks from Pyrus: ' + error.message);
    }

    this.logger.log(`Sync completed: success=${result.success}, failed=${result.failed}`);
    return result;
  }
}
