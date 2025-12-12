import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudioStatus, GroupStatus, CalendarEventStatus, EventParticipantStatus } from '@prisma/client';
import { TimepadService } from '../integrations/timepad/timepad.service';

@Injectable()
export class PublicWidgetService {
  private readonly logger = new Logger(PublicWidgetService.name);

  constructor(
    private prisma: PrismaService,
    private timepadService: TimepadService,
  ) {}

  /**
   * Получить список активных студий с группами и расписанием
   */
  async getStudios(studioId?: string) {
    const where: any = {
      status: StudioStatus.ACTIVE,
    };

    if (studioId) {
      where.id = studioId;
    }

    const studios = await this.prisma.studio.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        photoUrl: true,
        category: true,
        groups: {
          where: { status: GroupStatus.ACTIVE },
          orderBy: [
            { ageMin: { sort: 'asc', nulls: 'last' } },
            { name: 'asc' },
          ],
          select: {
            id: true,
            name: true,
            weeklySchedule: true,
            duration: true,
            ageMin: true,
            ageMax: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            room: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Фильтруем студии без активных групп
    return studios.filter(studio => studio.groups.length > 0);
  }

  /**
   * Получить список типов событий для фильтра
   */
  async getEventTypes() {
    const eventTypes = await this.prisma.eventType.findMany({
      where: {
        events: {
          some: {
            date: { gte: new Date() },
            status: {
              in: [CalendarEventStatus.PLANNED, CalendarEventStatus.ONGOING],
            },
            isHiddenFromWidget: false,
          },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    return eventTypes;
  }

  /**
   * Получить даты, в которые есть мероприятия (для линейки дат)
   */
  async getEventDates(days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    const events = await this.prisma.event.findMany({
      where: {
        date: {
          gte: today,
          lt: endDate,
        },
        status: {
          in: [CalendarEventStatus.PLANNED, CalendarEventStatus.ONGOING],
        },
        isHiddenFromWidget: false,
      },
      select: {
        date: true,
      },
      distinct: ['date'],
    });

    return events.map(e => e.date.toISOString().split('T')[0]);
  }

  /**
   * Получить список предстоящих мероприятий
   */
  async getEvents(params: {
    eventTypeId?: string;
    isForChildren?: boolean;
    hasAvailableSeats?: boolean;
    date?: string;
    limit?: number;
  }) {
    const { eventTypeId, isForChildren, hasAvailableSeats, date, limit = 20 } = params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      date: { gte: today },
      status: {
        in: [CalendarEventStatus.PLANNED, CalendarEventStatus.ONGOING],
      },
      isHiddenFromWidget: false,
    };

    if (eventTypeId) {
      where.eventTypeId = eventTypeId;
    }

    if (isForChildren !== undefined) {
      where.isForChildren = isForChildren;
    }

    // Для фильтра hasAvailableSeats фильтруем после запроса
    // так как Prisma не поддерживает сравнение двух полей напрямую

    if (date) {
      // Для @db.Date сравниваем через equals с датой в UTC
      where.date = {
        equals: new Date(`${date}T00:00:00.000Z`),
      };
    }

    // Берём больше записей если нужна фильтрация по свободным местам
    const fetchLimit = hasAvailableSeats ? limit * 3 : limit;

    const events = await this.prisma.event.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: fetchLimit,
      select: {
        id: true,
        name: true,
        description: true,
        photoUrl: true,
        date: true,
        startTime: true,
        endTime: true,
        timepadLink: true,
        maxCapacity: true,
        participants: true,
        // Новые поля для виджета
        eventFormat: true,
        ageRating: true,
        ageDescription: true,
        isForChildren: true,
        room: {
          select: {
            name: true,
            number: true,
          },
        },
        eventType: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    // Фильтруем по свободным местам если нужно
    let filteredEvents = events;
    if (hasAvailableSeats) {
      // Получаем данные о билетах из Timepad для событий с timepadLink
      const eventIds = events.map(e => e.id);
      const ticketsData = await this.getTicketsAvailability(eventIds);

      filteredEvents = events.filter(event => {
        if (event.maxCapacity === null) return false;

        // Проверяем данные из Timepad
        const ticketInfo = ticketsData[event.id];
        if (ticketInfo) {
          return ticketInfo.available > 0;
        }

        // Fallback на локальные данные если Timepad не вернул информацию
        const participants = event.participants ?? 0;
        return participants < event.maxCapacity;
      });
    }

    // Форматируем время для удобства frontend и ограничиваем количество
    return filteredEvents.slice(0, limit).map(event => ({
      ...event,
      date: event.date.toISOString().split('T')[0],
      startTime: this.formatTime(event.startTime),
      endTime: this.formatTime(event.endTime),
    }));
  }

  /**
   * Получить детали мероприятия
   */
  async getEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        fullDescription: true,
        photoUrl: true,
        date: true,
        startTime: true,
        endTime: true,
        timepadLink: true,
        maxCapacity: true,
        participants: true,
        // Новые поля для виджета
        ageRating: true,
        ageDescription: true,
        isForChildren: true,
        isHiddenFromWidget: true, // Для проверки доступа
        room: {
          select: {
            name: true,
            number: true,
          },
        },
        eventType: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    if (!event || event.isHiddenFromWidget) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return {
      ...event,
      date: event.date.toISOString().split('T')[0],
      startTime: this.formatTime(event.startTime),
      endTime: this.formatTime(event.endTime),
    };
  }

  /**
   * Форматировать время из Date в строку HH:mm
   */
  private formatTime(time: Date): string {
    return time.toISOString().substr(11, 5);
  }

  /**
   * Получить количество доступных билетов из Timepad + CRM для списка мероприятий
   * Формула: available = maxCapacity - timepadRegistrations - crmRegistrations
   */
  async getTicketsAvailability(eventIds: string[]): Promise<Record<string, { available: number; total: number; sold: number; crmRegistrations: number; timepadRegistrations: number } | null>> {
    // Получаем мероприятия с maxCapacity
    const events = await this.prisma.event.findMany({
      where: {
        id: { in: eventIds },
      },
      select: {
        id: true,
        timepadLink: true,
        maxCapacity: true,
      },
    });

    // Получаем количество CRM регистраций для всех событий
    const crmRegistrationsCounts = await this.prisma.eventParticipant.groupBy({
      by: ['eventId'],
      where: {
        eventId: { in: eventIds },
        status: { in: [EventParticipantStatus.REGISTERED, EventParticipantStatus.CONFIRMED] },
      },
      _count: { id: true },
    });

    // Преобразуем в Map для быстрого доступа
    const crmCountsMap = new Map<string, number>();
    crmRegistrationsCounts.forEach(item => {
      crmCountsMap.set(item.eventId, item._count.id);
    });

    const result: Record<string, { available: number; total: number; sold: number; crmRegistrations: number; timepadRegistrations: number } | null> = {};

    // Инициализируем все eventIds как null
    eventIds.forEach(id => {
      result[id] = null;
    });

    // Параллельно запрашиваем данные из Timepad
    const promises = events.map(async (event) => {
      if (!event.maxCapacity) {
        return { eventId: event.id, data: null };
      }

      const crmRegistrations = crmCountsMap.get(event.id) || 0;
      let timepadRegistrations = 0;

      // Получаем данные из Timepad если есть ссылка
      if (event.timepadLink) {
        try {
          const timepadEventId = this.timepadService.extractEventId(event.timepadLink);
          if (timepadEventId) {
            // Запрашиваем заказы и считаем билеты
            const ordersResponse = await this.timepadService.getEventOrders(timepadEventId, { limit: 250 });

            // Считаем количество билетов (не заказов!)
            // Учитываем только активные заказы (ok, paid)
            for (const order of ordersResponse.values || []) {
              const status = order.status?.name?.toLowerCase();
              if (status === 'ok' || status === 'paid') {
                timepadRegistrations += order.tickets?.length || 1;
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to get Timepad data for event ${event.id}: ${error.message}`);
          // Продолжаем с нулем от Timepad
        }
      }

      const total = event.maxCapacity;
      const totalSold = timepadRegistrations + crmRegistrations;
      const available = Math.max(0, total - totalSold);

      return {
        eventId: event.id,
        data: {
          available,
          total,
          sold: totalSold,
          crmRegistrations,
          timepadRegistrations,
        },
      };
    });

    const results = await Promise.all(promises);

    results.forEach(({ eventId, data }) => {
      result[eventId] = data;
    });

    return result;
  }
}
