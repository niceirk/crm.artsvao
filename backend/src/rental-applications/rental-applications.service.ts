import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { InvoicesService } from '../invoices/invoices.service';
import {
  CreateRentalApplicationDto,
  UpdateRentalApplicationDto,
  CheckAvailabilityDto,
  CalculatePriceDto,
  ExtendRentalDto,
  CancelRentalDto,
  GetHourlyOccupancyDto,
  GetRoomMonthlyOccupancyDto,
} from './dto';
import {
  RentalType,
  RentalPeriodType,
  PriceUnit,
  RentalApplicationStatus,
  CalendarEventStatus,
  ServiceType,
  WriteOffTiming,
  Prisma,
} from '@prisma/client';
import { AvailabilityResult, PriceCalculation, ConflictInfo } from './types';

@Injectable()
export class RentalApplicationsService {
  // Максимальный период аренды в днях (защита от DoS через большой диапазон дат)
  private readonly MAX_RENTAL_DAYS = 365;

  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
    private invoicesService: InvoicesService,
  ) {}

  /**
   * Генерация номера заявки
   */
  private async generateApplicationNumber(): Promise<string> {
    const lastApplication = await this.prisma.rentalApplication.findFirst({
      where: {
        applicationNumber: { not: { contains: '-' } }, // только новый формат (без дефисов)
      },
      orderBy: { applicationNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastApplication) {
      nextNumber = parseInt(lastApplication.applicationNumber) + 1;
    } else {
      // Если нет заявок в новом формате, ищем последнюю в старом формате
      const lastOldFormat = await this.prisma.rentalApplication.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (lastOldFormat && lastOldFormat.applicationNumber.includes('-')) {
        const lastNumber = parseInt(lastOldFormat.applicationNumber.split('-').pop() || '0');
        nextNumber = lastNumber + 1;
      }
    }

    return nextNumber.toString().padStart(7, '0');
  }

  /**
   * Расчет цены аренды
   */
  async calculatePrice(dto: CalculatePriceDto): Promise<PriceCalculation> {
    const { rentalType, roomId, workspaceIds, periodType, startDate, endDate, startTime, endTime, selectedDays } = dto;

    let basePrice = 0;
    let quantity = 1;
    let priceUnit: PriceUnit = PriceUnit.DAY;
    const breakdown: { date?: string; price: number }[] = [];

    // Получаем ставки в зависимости от типа аренды
    if (rentalType === RentalType.HOURLY) {
      // Почасовая аренда
      if (!roomId) throw new BadRequestException('roomId обязателен для почасовой аренды');
      if (!startTime || !endTime) throw new BadRequestException('startTime и endTime обязательны для почасовой аренды');

      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException('Помещение не найдено');

      basePrice = Number(room.hourlyRate);
      priceUnit = PriceUnit.HOUR;

      // Расчет количества часов
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      quantity = Math.ceil((endMinutes - startMinutes) / 60);

    } else if (rentalType.startsWith('WORKSPACE_')) {
      // Аренда рабочих мест
      if (!workspaceIds?.length) throw new BadRequestException('workspaceIds обязателен для аренды рабочих мест');

      const workspaces = await this.prisma.workspace.findMany({
        where: { id: { in: workspaceIds } },
      });

      if (workspaces.length !== workspaceIds.length) {
        throw new NotFoundException('Некоторые рабочие места не найдены');
      }

      if (rentalType === RentalType.WORKSPACE_DAILY) {
        priceUnit = PriceUnit.DAY;
        basePrice = workspaces.reduce((sum, w) => sum + Number(w.dailyRate), 0);
        quantity = this.calculateDaysCount(periodType, startDate, endDate, selectedDays);
      } else if (rentalType === RentalType.WORKSPACE_WEEKLY) {
        priceUnit = PriceUnit.WEEK;
        basePrice = workspaces.reduce((sum, w) => sum + Number(w.weeklyRate || Number(w.dailyRate) * 7), 0);
        quantity = this.calculateWeeksCount(startDate, endDate);
      } else if (rentalType === RentalType.WORKSPACE_MONTHLY) {
        priceUnit = PriceUnit.MONTH;
        basePrice = workspaces.reduce((sum, w) => sum + Number(w.monthlyRate), 0);
        quantity = this.calculateMonthsCount(periodType, startDate, endDate);
      }

    } else if (rentalType.startsWith('ROOM_')) {
      // Аренда кабинета целиком
      if (!roomId) throw new BadRequestException('roomId обязателен для аренды кабинета');

      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException('Помещение не найдено');
      if (!room.isCoworking) throw new BadRequestException('Помещение не является коворкингом');

      if (rentalType === RentalType.ROOM_DAILY) {
        priceUnit = PriceUnit.DAY;
        basePrice = Number(room.dailyRateCoworking || room.dailyRate || 0);
        quantity = this.calculateDaysCount(periodType, startDate, endDate, selectedDays);
      } else if (rentalType === RentalType.ROOM_WEEKLY) {
        priceUnit = PriceUnit.WEEK;
        basePrice = Number(room.weeklyRateCoworking || Number(room.dailyRateCoworking || room.dailyRate || 0) * 7);
        quantity = this.calculateWeeksCount(startDate, endDate);
      } else if (rentalType === RentalType.ROOM_MONTHLY) {
        priceUnit = PriceUnit.MONTH;
        basePrice = Number(room.monthlyRateCoworking || 0);
        quantity = this.calculateMonthsCount(periodType, startDate, endDate);
      }
    }

    return {
      basePrice,
      quantity,
      priceUnit,
      totalPrice: basePrice * quantity,
      breakdown,
    };
  }

  /**
   * Проверка доступности
   */
  async checkAvailability(dto: CheckAvailabilityDto): Promise<AvailabilityResult> {
    const { rentalType, roomId, workspaceIds, periodType, startDate, endDate, startTime, endTime, selectedDays, excludeApplicationId } = dto;
    const conflicts: ConflictInfo[] = [];

    // Получаем все даты для проверки
    const datesToCheck = this.getDatesToCheck(periodType, startDate, endDate, selectedDays);

    // Определяем roomId для проверки
    let roomIdToCheck = roomId;
    if (workspaceIds?.length && !roomId) {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: workspaceIds[0] },
        select: { roomId: true },
      });
      roomIdToCheck = workspace?.roomId;
    }

    if (!roomIdToCheck) {
      throw new BadRequestException('Не удалось определить помещение для проверки');
    }

    // Для рабочих мест (WORKSPACE_*) НЕ проверяем конфликты через conflictChecker для помещения,
    // потому что рабочие места бронируются независимо друг от друга.
    // Проверяем только конфликты с другими заявками на те же конкретные рабочие места.
    const isWorkspaceRental = rentalType.startsWith('WORKSPACE_');

    if (!isWorkspaceRental) {
      // Для почасовой аренды и аренды кабинетов целиком - проверяем конфликты помещения
      for (const date of datesToCheck) {
        try {
          if (rentalType === RentalType.HOURLY && startTime && endTime) {
            await this.conflictChecker.checkConflicts({
              date,
              startTime,
              endTime,
              roomIds: [roomIdToCheck],
              excludeApplicationId,
            });
          } else {
            // Для дневной/недельной/месячной аренды проверяем весь день
            await this.conflictChecker.checkConflicts({
              date,
              startTime: '00:00',
              endTime: '23:59',
              roomIds: [roomIdToCheck],
              excludeApplicationId,
            });
          }
        } catch (error) {
          if (error instanceof ConflictException) {
            conflicts.push({
              date,
              type: 'schedule',
              description: error.message,
              startTime,
              endTime,
            });
          }
        }
      }
    }

    // Проверяем существующие заявки на аренду рабочих мест
    // Включаем DRAFT и PENDING, чтобы предотвратить двойное бронирование
    if (workspaceIds?.length) {
      const existingApplications = await this.prisma.rentalApplication.findMany({
        where: {
          id: excludeApplicationId ? { not: excludeApplicationId } : undefined,
          status: { in: [RentalApplicationStatus.DRAFT, RentalApplicationStatus.PENDING, RentalApplicationStatus.CONFIRMED, RentalApplicationStatus.ACTIVE] },
          workspaces: { some: { workspaceId: { in: workspaceIds } } },
          OR: datesToCheck.map(date => ({
            AND: [
              { startDate: { lte: new Date(date) } },
              { OR: [{ endDate: { gte: new Date(date) } }, { endDate: null }] },
            ],
          })),
        },
        include: {
          workspaces: { include: { workspace: true } },
          selectedDays: true,
        },
      });

      for (const app of existingApplications) {
        // Определяем какие даты реально заняты этой заявкой
        const appOccupiedDates = new Set<string>();

        if (app.periodType === 'SPECIFIC_DAYS') {
          // Для конкретных дней берём из selectedDays
          for (const day of app.selectedDays) {
            appOccupiedDates.add(day.date.toISOString().split('T')[0]);
          }
        } else {
          // Для остальных типов - все дни в периоде (с лимитом для защиты от DoS)
          const appStart = new Date(app.startDate);
          const appEnd = app.endDate ? new Date(app.endDate) : appStart;
          const current = new Date(appStart);
          let iterations = 0;
          while (current <= appEnd && iterations < this.MAX_RENTAL_DAYS) {
            appOccupiedDates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
            iterations++;
          }
        }

        for (const date of datesToCheck) {
          if (appOccupiedDates.has(date)) {
            // Проверяем какие именно рабочие места конфликтуют
            const conflictingWorkspaces = app.workspaces
              .filter(w => workspaceIds.includes(w.workspaceId))
              .map(w => w.workspace.name);

            if (conflictingWorkspaces.length > 0) {
              conflicts.push({
                date,
                type: 'rental',
                description: `Рабочие места (${conflictingWorkspaces.join(', ')}) уже забронированы заявкой ${app.applicationNumber}`,
              });
            }
          }
        }
      }
    }

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Получение занятых почасовых слотов для помещения
   * Оптимизированный батчевый запрос для загрузки всех слотов за один раз
   * Проверяет все источники: Rental, Event, Schedule, Reservation
   * @returns Map: "yyyy-MM-dd_HH" -> boolean (занят)
   */
  async getHourlyOccupancy(dto: GetHourlyOccupancyDto): Promise<Record<string, boolean>> {
    const { roomId, dates } = dto;
    const occupiedSlots: Record<string, boolean> = {};
    const parsedDates = dates.map(d => new Date(d));

    // Параллельно загружаем все источники занятости
    const [rentals, events, schedules, reservations] = await Promise.all([
      // 1. Получаем все Rental записи (аренды)
      this.prisma.rental.findMany({
        where: {
          roomId,
          date: { in: parsedDates },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      }),

      // 2. Получаем события из Event (мероприятия)
      this.prisma.event.findMany({
        where: {
          roomId,
          date: { in: parsedDates },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      }),

      // 3. Получаем Schedule записи (занятия групп)
      this.prisma.schedule.findMany({
        where: {
          roomId,
          date: { in: parsedDates },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      }),

      // 4. Получаем Reservation записи (резервы)
      this.prisma.reservation.findMany({
        where: {
          roomId,
          date: { in: parsedDates },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    // Объединяем все занятые слоты из всех источников
    const allBookings = [...rentals, ...events, ...schedules, ...reservations];

    // Для каждого бронирования определяем какие часовые слоты заняты
    for (const booking of allBookings) {
      // Форматируем дату в локальном часовом поясе (sv-SE даёт формат YYYY-MM-DD)
      const dateStr = booking.date.toLocaleDateString('sv-SE');

      // Получаем часы начала и конца в UTC (Prisma возвращает TIME как Date в UTC)
      const startHour = booking.startTime.getUTCHours();
      const endHour = booking.endTime.getUTCHours();

      // Помечаем все часовые слоты в диапазоне как занятые
      // Слот считается занятым если бронирование пересекается с ним
      for (let hour = 9; hour <= 21; hour++) {
        // Проверяем пересечение: слот [hour, hour+1] и бронирование [startHour, endHour]
        if (hour < endHour && hour + 1 > startHour) {
          const slotKey = `${dateStr}_${hour}`;
          occupiedSlots[slotKey] = true;
        }
      }
    }

    return occupiedSlots;
  }

  /**
   * Получение занятости помещения по дням (для ROOM_MONTHLY коворкинга без мест)
   * Проверяет все источники: Rental, Event, Schedule, Reservation
   * @returns Record: "yyyy-MM-dd" -> { type, description } | null
   */
  async getRoomMonthlyOccupancy(
    dto: GetRoomMonthlyOccupancyDto,
  ): Promise<Record<string, { type: string; description: string } | null>> {
    const { roomId, startDate, endDate } = dto;
    const occupiedDays: Record<string, { type: string; description: string } | null> = {};

    // Генерируем все даты в диапазоне
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Инициализируем все даты как свободные
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0];
      occupiedDays[dateStr] = null;
    }

    // Параллельно загружаем все источники занятости
    const [rentals, events, schedules, reservations] = await Promise.all([
      // 1. Rental записи (включая из RentalApplication)
      this.prisma.rental.findMany({
        where: {
          roomId,
          date: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          clientName: true,
          eventType: true,
          rentalApplication: {
            select: {
              applicationNumber: true,
              client: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),

      // 2. Event (мероприятия)
      this.prisma.event.findMany({
        where: {
          roomId,
          date: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          name: true,
        },
      }),

      // 3. Schedule (занятия групп)
      this.prisma.schedule.findMany({
        where: {
          roomId,
          date: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          group: { select: { name: true } },
        },
      }),

      // 4. Reservation (резервы)
      this.prisma.reservation.findMany({
        where: {
          roomId,
          date: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        select: {
          date: true,
          notes: true,
          reservedBy: true,
        },
      }),
    ]);

    // Обрабатываем Rental записи
    for (const rental of rentals) {
      const dateStr = rental.date.toLocaleDateString('sv-SE');
      if (occupiedDays[dateStr] === null) {
        const clientName = rental.rentalApplication?.client
          ? `${rental.rentalApplication.client.lastName} ${rental.rentalApplication.client.firstName}`
          : rental.clientName;
        occupiedDays[dateStr] = {
          type: 'rental',
          description: rental.rentalApplication
            ? `Аренда ${rental.rentalApplication.applicationNumber}: ${clientName}`
            : `Аренда: ${clientName || rental.eventType || 'Без описания'}`,
        };
      }
    }

    // Обрабатываем Event
    for (const event of events) {
      const dateStr = event.date.toLocaleDateString('sv-SE');
      if (occupiedDays[dateStr] === null) {
        occupiedDays[dateStr] = {
          type: 'event',
          description: `Мероприятие: ${event.name}`,
        };
      }
    }

    // Обрабатываем Schedule
    for (const schedule of schedules) {
      const dateStr = schedule.date.toLocaleDateString('sv-SE');
      if (occupiedDays[dateStr] === null) {
        occupiedDays[dateStr] = {
          type: 'schedule',
          description: `Занятие: ${schedule.group?.name || 'Без группы'}`,
        };
      }
    }

    // Обрабатываем Reservation
    for (const reservation of reservations) {
      const dateStr = reservation.date.toLocaleDateString('sv-SE');
      if (occupiedDays[dateStr] === null) {
        occupiedDays[dateStr] = {
          type: 'reservation',
          description: `Резерв: ${reservation.reservedBy || reservation.notes || 'Без описания'}`,
        };
      }
    }

    return occupiedDays;
  }

  /**
   * Создание заявки
   */
  async create(dto: CreateRentalApplicationDto, managerId: string) {
    // Валидация клиента
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException('Клиент не найден');

    // Валидация помещения
    if (dto.roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
      if (!room) throw new NotFoundException('Помещение не найдено');
    }

    // Валидация рабочих мест
    if (dto.workspaceIds?.length) {
      const workspaces = await this.prisma.workspace.findMany({
        where: { id: { in: dto.workspaceIds } },
      });
      if (workspaces.length !== dto.workspaceIds.length) {
        throw new NotFoundException('Некоторые рабочие места не найдены');
      }
    }

    // Проверка доступности (если не игнорируем конфликты)
    if (!dto.ignoreConflicts) {
      // Для HOURLY с массивом слотов - проверяем каждый слот
      if (dto.rentalType === RentalType.HOURLY && dto.hourlySlots?.length && dto.roomId) {
        const conflicts: ConflictInfo[] = [];
        for (const slot of dto.hourlySlots) {
          try {
            await this.conflictChecker.checkConflicts({
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              roomIds: [dto.roomId],
            });
          } catch (error) {
            if (error instanceof ConflictException) {
              conflicts.push({
                date: slot.date,
                type: 'schedule',
                description: error.message,
                startTime: slot.startTime,
                endTime: slot.endTime,
              });
            }
          }
        }
        if (conflicts.length > 0) {
          throw new ConflictException({
            message: 'Обнаружены конфликты бронирования',
            conflicts,
          });
        }
      } else {
        // Стандартная проверка для других типов
        const availability = await this.checkAvailability({
          rentalType: dto.rentalType,
          roomId: dto.roomId,
          workspaceIds: dto.workspaceIds,
          periodType: dto.periodType,
          startDate: dto.startDate,
          endDate: dto.endDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          selectedDays: dto.selectedDays,
        });

        if (!availability.available) {
          throw new ConflictException({
            message: 'Обнаружены конфликты бронирования',
            conflicts: availability.conflicts,
          });
        }
      }
    }

    // Расчет цены
    let quantity: number;
    let totalPrice: number;
    let effectivePrice: number;
    let startDateForApp: Date;
    let endDateForApp: Date | null;

    // Для HOURLY с массивом слотов - особая логика расчёта
    if (dto.rentalType === RentalType.HOURLY && dto.hourlySlots?.length) {
      quantity = dto.hourlySlots.length;
      effectivePrice = dto.adjustedPrice ?? dto.basePrice;
      totalPrice = effectivePrice * quantity;

      // Определяем диапазон дат из слотов
      const sortedSlots = [...dto.hourlySlots].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      startDateForApp = new Date(sortedSlots[0].date);
      const lastDate = new Date(sortedSlots[sortedSlots.length - 1].date);
      endDateForApp = sortedSlots.length > 1 && lastDate.getTime() !== startDateForApp.getTime()
        ? lastDate
        : null;
    } else {
      // Стандартный расчёт для других типов
      const priceCalculation = await this.calculatePrice({
        rentalType: dto.rentalType,
        roomId: dto.roomId,
        workspaceIds: dto.workspaceIds,
        periodType: dto.periodType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        selectedDays: dto.selectedDays,
      });

      quantity = dto.quantity ?? priceCalculation.quantity;
      effectivePrice = dto.adjustedPrice ?? dto.basePrice ?? priceCalculation.basePrice;
      totalPrice = effectivePrice * quantity;
      startDateForApp = new Date(dto.startDate);
      endDateForApp = dto.endDate ? new Date(dto.endDate) : null;
    }

    const applicationNumber = await this.generateApplicationNumber();

    // Создание в транзакции
    return this.prisma.$transaction(async (tx) => {
      // Для hourlySlots берём время из первого слота для отображения
      const firstSlotStartTime = dto.hourlySlots?.length ? dto.hourlySlots[0].startTime : dto.startTime;
      const firstSlotEndTime = dto.hourlySlots?.length ? dto.hourlySlots[0].endTime : dto.endTime;

      const application = await tx.rentalApplication.create({
        data: {
          applicationNumber,
          rentalType: dto.rentalType,
          roomId: dto.roomId,
          clientId: dto.clientId,
          periodType: dto.periodType,
          startDate: startDateForApp,
          endDate: endDateForApp,
          startTime: firstSlotStartTime ? this.timeStringToDate(firstSlotStartTime) : null,
          endTime: firstSlotEndTime ? this.timeStringToDate(firstSlotEndTime) : null,
          basePrice: effectivePrice,
          adjustedPrice: dto.adjustedPrice,
          totalPrice,
          priceUnit: dto.priceUnit ?? 'HOUR',
          quantity,
          adjustmentReason: dto.adjustmentReason,
          paymentType: dto.paymentType,
          status: RentalApplicationStatus.DRAFT,
          managerId,
          notes: dto.notes,
          eventType: dto.eventType,
        },
      });

      // Связь с рабочими местами
      if (dto.workspaceIds?.length) {
        await tx.rentalApplicationWorkspace.createMany({
          data: dto.workspaceIds.map(workspaceId => ({
            rentalApplicationId: application.id,
            workspaceId,
          })),
        });
      }

      // Связь с выбранными днями
      if (dto.selectedDays?.length) {
        await tx.rentalApplicationDay.createMany({
          data: dto.selectedDays.map(date => ({
            rentalApplicationId: application.id,
            date: new Date(date),
          })),
        });
      }

      // Определяем помещение (либо напрямую из roomId, либо из первого workspace)
      let roomId = dto.roomId;
      if (!roomId && dto.workspaceIds?.length) {
        const firstWorkspace = await tx.workspace.findUnique({
          where: { id: dto.workspaceIds[0] },
        });
        roomId = firstWorkspace?.roomId;
      }

      // Создаем записи Rental для блокировки в календаре
      if (roomId) {
        const clientName = `${client.lastName} ${client.firstName}`;

        // Для HOURLY с массивом слотов - создаём Rental для каждого слота
        if (dto.rentalType === RentalType.HOURLY && dto.hourlySlots?.length) {
          for (const slot of dto.hourlySlots) {
            await tx.rental.create({
              data: {
                roomId,
                clientId: dto.clientId,
                clientName,
                clientPhone: client.phone,
                clientEmail: client.email,
                eventType: dto.eventType || 'Почасовая аренда',
                date: new Date(slot.date),
                startTime: this.timeStringToDate(slot.startTime),
                endTime: this.timeStringToDate(slot.endTime),
                totalPrice: effectivePrice, // Цена за 1 час
                managerId,
                notes: dto.notes,
                status: CalendarEventStatus.PLANNED,
                rentalApplicationId: application.id,
                rentalType: dto.rentalType,
              },
            });
          }
        } else {
          // Стандартная логика для других типов
          const datesToBlock = this.getDatesToCheck(
            dto.periodType,
            dto.startDate,
            dto.endDate,
            dto.selectedDays,
          );

          for (const date of datesToBlock) {
            await tx.rental.create({
              data: {
                roomId,
                clientId: dto.clientId,
                clientName,
                clientPhone: client.phone,
                clientEmail: client.email,
                eventType: dto.eventType || this.getRentalTypeLabel(dto.rentalType),
                date: new Date(date),
                startTime: dto.startTime ? this.timeStringToDate(dto.startTime) : this.timeStringToDate('00:00'),
                endTime: dto.endTime ? this.timeStringToDate(dto.endTime) : this.timeStringToDate('23:59'),
                totalPrice: Number(totalPrice) / datesToBlock.length,
                managerId,
                notes: dto.notes,
                status: CalendarEventStatus.PLANNED,
                rentalApplicationId: application.id,
                rentalType: dto.rentalType,
              },
            });
          }
        }
      }

      // Возвращаем заявку с полными данными
      return tx.rentalApplication.findUnique({
        where: { id: application.id },
        include: {
          room: { select: { id: true, name: true, number: true, hourlyRate: true, dailyRateCoworking: true, weeklyRateCoworking: true, monthlyRateCoworking: true } },
          client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          workspaces: { include: { workspace: true } },
          selectedDays: true,
          invoices: true,
          rentals: true,
        },
      });
    }, {
      maxWait: 5000,
      timeout: 45000,
    });
  }

  /**
   * Получение списка заявок
   */
  async findAll(filters?: {
    status?: RentalApplicationStatus;
    rentalType?: RentalType;
    clientId?: string;
    roomId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const where: Prisma.RentalApplicationWhereInput = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.rentalType) where.rentalType = filters.rentalType;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.roomId) where.roomId = filters.roomId;

    if (filters?.startDate && filters?.endDate) {
      where.OR = [
        { startDate: { gte: new Date(filters.startDate), lte: new Date(filters.endDate) } },
        { endDate: { gte: new Date(filters.startDate), lte: new Date(filters.endDate) } },
      ];
    }

    if (filters?.search) {
      where.OR = [
        { applicationNumber: { contains: filters.search, mode: 'insensitive' } },
        { client: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { client: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.rentalApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { id: true, name: true, number: true } },
        client: { select: { id: true, firstName: true, lastName: true, phone: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        workspaces: { include: { workspace: true } },
        selectedDays: true,
        invoices: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
        _count: { select: { rentals: true, invoices: true } },
      },
    });
  }

  /**
   * Получение заявки по ID
   */
  async findOne(id: string) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, name: true, number: true, hourlyRate: true, dailyRateCoworking: true, weeklyRateCoworking: true, monthlyRateCoworking: true } },
        client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
        workspaces: { include: { workspace: true } },
        selectedDays: true,
        invoices: true,
        rentals: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Заявка на аренду не найдена');
    }

    return application;
  }

  /**
   * Обновление заявки
   */
  async update(id: string, dto: UpdateRentalApplicationDto, managerId: string) {
    const existing = await this.findOne(id);

    // 1. Для CANCELLED и COMPLETED - всегда запрет
    if (
      existing.status === RentalApplicationStatus.CANCELLED ||
      existing.status === RentalApplicationStatus.COMPLETED
    ) {
      throw new BadRequestException('Невозможно редактировать отменённую или завершённую заявку');
    }

    // 2. Для CONFIRMED/ACTIVE - проверяем связанный счёт
    let linkedInvoice: any = null;
    if (existing.status !== RentalApplicationStatus.DRAFT) {
      const editCheck = await this.checkEditability(id);
      if (!editCheck.canEdit) {
        throw new BadRequestException(editCheck.reason);
      }
      linkedInvoice = editCheck.invoice;
    }

    return this.prisma.$transaction(async (tx) => {
      // Обновляем основные данные
      const updateData: Prisma.RentalApplicationUpdateInput = {}

      if (dto.rentalType !== undefined) updateData.rentalType = dto.rentalType;
      if (dto.roomId !== undefined) updateData.room = { connect: { id: dto.roomId } };
      if (dto.clientId !== undefined) updateData.client = { connect: { id: dto.clientId } };
      if (dto.periodType !== undefined) updateData.periodType = dto.periodType;
      if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
      if (dto.startTime !== undefined) updateData.startTime = this.timeStringToDate(dto.startTime);
      if (dto.endTime !== undefined) updateData.endTime = this.timeStringToDate(dto.endTime);
      if (dto.basePrice !== undefined) updateData.basePrice = dto.basePrice;
      if (dto.adjustedPrice !== undefined) updateData.adjustedPrice = dto.adjustedPrice;
      if (dto.adjustmentReason !== undefined) updateData.adjustmentReason = dto.adjustmentReason;
      if (dto.priceUnit !== undefined) updateData.priceUnit = dto.priceUnit;
      if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
      if (dto.paymentType !== undefined) updateData.paymentType = dto.paymentType;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.eventType !== undefined) updateData.eventType = dto.eventType;
      if (dto.status !== undefined) updateData.status = dto.status;

      // Пересчет totalPrice
      if (dto.basePrice !== undefined || dto.adjustedPrice !== undefined || dto.quantity !== undefined) {
        const price = dto.adjustedPrice ?? dto.basePrice ?? Number(existing.adjustedPrice ?? existing.basePrice);
        const qty = dto.quantity ?? Number(existing.quantity);
        updateData.totalPrice = price * qty;
      }

      await tx.rentalApplication.update({
        where: { id },
        data: updateData,
      });

      // Обновляем рабочие места
      if (dto.workspaceIds !== undefined) {
        await tx.rentalApplicationWorkspace.deleteMany({ where: { rentalApplicationId: id } });
        if (dto.workspaceIds.length > 0) {
          await tx.rentalApplicationWorkspace.createMany({
            data: dto.workspaceIds.map(workspaceId => ({
              rentalApplicationId: id,
              workspaceId,
            })),
          });
        }
      }

      // Обновляем выбранные дни
      if (dto.selectedDays !== undefined) {
        await tx.rentalApplicationDay.deleteMany({ where: { rentalApplicationId: id } });
        if (dto.selectedDays.length > 0) {
          await tx.rentalApplicationDay.createMany({
            data: dto.selectedDays.map(date => ({
              rentalApplicationId: id,
              date: new Date(date),
            })),
          });
        }
      }

      // Пересоздаем Rental записи если изменились параметры расписания или hourlySlots
      const needsRentalRecreation =
        dto.startDate !== undefined ||
        dto.endDate !== undefined ||
        dto.startTime !== undefined ||
        dto.endTime !== undefined ||
        dto.roomId !== undefined ||
        dto.periodType !== undefined ||
        dto.selectedDays !== undefined ||
        dto.workspaceIds !== undefined ||
        dto.hourlySlots !== undefined;

      if (needsRentalRecreation) {
        // Удаляем старые Rental записи
        await tx.rental.deleteMany({
          where: { rentalApplicationId: id },
        });

        // Получаем обновленные данные заявки для создания новых Rental
        const updatedApplication = await tx.rentalApplication.findUnique({
          where: { id },
          include: {
            client: true,
            selectedDays: true,
            workspaces: { include: { workspace: true } },
          },
        });

        if (updatedApplication) {
          // Определяем помещение
          let roomId = updatedApplication.roomId;
          if (!roomId && updatedApplication.workspaces.length) {
            roomId = updatedApplication.workspaces[0].workspace.roomId;
          }

          if (roomId) {
            const clientName = `${updatedApplication.client.lastName} ${updatedApplication.client.firstName}`;

            // Для HOURLY с массивом слотов - создаём Rental для каждого слота
            if (updatedApplication.rentalType === RentalType.HOURLY && dto.hourlySlots?.length) {
              // Пересчитываем totalPrice и quantity на основе слотов
              const quantity = dto.hourlySlots.length;
              const effectivePrice = Number(updatedApplication.adjustedPrice ?? updatedApplication.basePrice);
              const totalPrice = effectivePrice * quantity;

              // Обновляем заявку с новыми значениями
              await tx.rentalApplication.update({
                where: { id },
                data: {
                  quantity,
                  totalPrice,
                  // Определяем диапазон дат из слотов
                  startDate: new Date(dto.hourlySlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date),
                  endDate: new Date(dto.hourlySlots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date),
                },
              });

              // Создаём Rental для каждого слота
              for (const slot of dto.hourlySlots) {
                await tx.rental.create({
                  data: {
                    roomId,
                    clientId: updatedApplication.clientId,
                    clientName,
                    clientPhone: updatedApplication.client.phone,
                    clientEmail: updatedApplication.client.email,
                    eventType: updatedApplication.eventType || 'Почасовая аренда',
                    date: new Date(slot.date),
                    startTime: this.timeStringToDate(slot.startTime),
                    endTime: this.timeStringToDate(slot.endTime),
                    totalPrice: effectivePrice, // Цена за 1 час
                    managerId,
                    notes: updatedApplication.notes,
                    status: CalendarEventStatus.PLANNED,
                    rentalApplicationId: updatedApplication.id,
                    rentalType: updatedApplication.rentalType,
                  },
                });
              }
            } else {
              // Стандартная логика для других типов
              const datesToBlock = this.getDatesToCheck(
                updatedApplication.periodType,
                updatedApplication.startDate.toISOString().split('T')[0],
                updatedApplication.endDate?.toISOString().split('T')[0],
                updatedApplication.selectedDays.map(d => d.date.toISOString().split('T')[0]),
              );

              for (const date of datesToBlock) {
                await tx.rental.create({
                  data: {
                    roomId,
                    clientId: updatedApplication.clientId,
                    clientName,
                    clientPhone: updatedApplication.client.phone,
                    clientEmail: updatedApplication.client.email,
                    eventType: updatedApplication.eventType || this.getRentalTypeLabel(updatedApplication.rentalType),
                    date: new Date(date),
                    startTime: updatedApplication.startTime || this.timeStringToDate('00:00'),
                    endTime: updatedApplication.endTime || this.timeStringToDate('23:59'),
                    totalPrice: Number(updatedApplication.totalPrice) / datesToBlock.length,
                    managerId,
                    notes: updatedApplication.notes,
                    status: CalendarEventStatus.PLANNED,
                    rentalApplicationId: updatedApplication.id,
                    rentalType: updatedApplication.rentalType,
                  },
                });
              }
            }
          }
        }
      }

      return id; // Возвращаем id для дальнейшей обработки
    }, {
      maxWait: 5000,
      timeout: 60000, // Увеличен таймаут для операций с множеством слотов
    });

    // Обновить связанный счёт если он есть (вне основной транзакции)
    if (linkedInvoice) {
      const updatedApp = await this.findOne(id);
      await this.updateLinkedInvoice(linkedInvoice.id, updatedApp, dto);
    }

    return this.findOne(id);
  }

  /**
   * Подтверждение заявки
   */
  async confirm(id: string, managerId: string) {
    const application = await this.findOne(id);

    if (application.status !== RentalApplicationStatus.DRAFT && application.status !== RentalApplicationStatus.PENDING) {
      throw new BadRequestException('Можно подтвердить только черновик или ожидающую заявку');
    }

    // Повторная проверка доступности
    const availability = await this.checkAvailability({
      rentalType: application.rentalType,
      roomId: application.roomId,
      workspaceIds: application.workspaces.map(w => w.workspaceId),
      periodType: application.periodType,
      startDate: application.startDate.toISOString().split('T')[0],
      endDate: application.endDate?.toISOString().split('T')[0],
      startTime: application.startTime ? this.dateToTimeString(application.startTime) : undefined,
      endTime: application.endTime ? this.dateToTimeString(application.endTime) : undefined,
      selectedDays: application.selectedDays.map(d => d.date.toISOString().split('T')[0]),
      excludeApplicationId: id,
    });

    if (!availability.available) {
      throw new ConflictException({
        message: 'Обнаружены конфликты при подтверждении',
        conflicts: availability.conflicts,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Rental записи уже созданы при создании DRAFT заявки, поэтому просто создаем счет

      // Определяем помещение для Invoice
      const roomId = application.roomId || application.workspaces[0]?.workspace.roomId;
      const room = application.room || (roomId ? await tx.room.findUnique({ where: { id: roomId } }) : null);

      await this.invoicesService.create({
        clientId: application.clientId,
        rentalApplicationId: application.id,
        items: [{
          serviceType: ServiceType.RENTAL,
          serviceName: this.getInvoiceItemName(application, room),
          serviceDescription: this.getInvoiceItemDescription(application),
          roomId,
          quantity: Number(application.quantity),
          basePrice: Number(application.adjustedPrice ?? application.basePrice),
          unitPrice: Number(application.adjustedPrice ?? application.basePrice),
          vatRate: 0,
          discountPercent: 0,
          writeOffTiming: WriteOffTiming.ON_SALE,
          isPriceAdjusted: !!application.adjustedPrice,
          adjustmentReason: application.adjustmentReason,
        }],
        notes: application.notes,
      }, managerId);

      // Обновляем статус заявки
      return tx.rentalApplication.update({
        where: { id },
        data: {
          status: RentalApplicationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
        include: {
          room: true,
          client: true,
          manager: true,
          workspaces: { include: { workspace: true } },
          selectedDays: true,
          invoices: true,
          rentals: true,
        },
      });
    }, {
      maxWait: 5000,
      timeout: 30000,
    });
  }

  /**
   * Продление аренды
   */
  async extend(id: string, dto: ExtendRentalDto, managerId: string) {
    const original = await this.findOne(id);

    // Создаем новую заявку на основе существующей
    const newApplication = await this.create({
      rentalType: original.rentalType,
      roomId: original.roomId,
      workspaceIds: original.workspaces.map(w => w.workspaceId),
      clientId: original.clientId,
      periodType: original.periodType,
      startDate: dto.newStartDate,
      endDate: dto.newEndDate,
      startTime: dto.startTime || (original.startTime ? this.dateToTimeString(original.startTime) : undefined),
      endTime: dto.endTime || (original.endTime ? this.dateToTimeString(original.endTime) : undefined),
      basePrice: Number(original.adjustedPrice ?? original.basePrice),
      adjustedPrice: dto.adjustedPrice,
      adjustmentReason: dto.adjustmentReason || `Продление заявки ${original.applicationNumber}`,
      priceUnit: original.priceUnit,
      paymentType: original.paymentType,
      eventType: original.eventType,
      notes: `Продление заявки ${original.applicationNumber}. ${original.notes || ''}`.trim(),
    }, managerId);

    return newApplication;
  }

  /**
   * Отмена заявки
   */
  async cancel(id: string, dto: CancelRentalDto, managerId: string) {
    const application = await this.findOne(id);

    if (application.status === RentalApplicationStatus.CANCELLED) {
      throw new BadRequestException('Заявка уже отменена');
    }

    if (application.status === RentalApplicationStatus.COMPLETED) {
      throw new BadRequestException('Нельзя отменить завершенную заявку');
    }

    return this.prisma.$transaction(async (tx) => {
      // Отменяем связанные Rental записи
      await tx.rental.updateMany({
        where: { rentalApplicationId: id },
        data: { status: CalendarEventStatus.CANCELLED },
      });

      // Отменяем неоплаченные счета
      const invoices = await tx.invoice.findMany({
        where: {
          rentalApplicationId: id,
          status: { in: ['DRAFT', 'PENDING'] },
        },
      });

      for (const invoice of invoices) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'CANCELLED' },
        });
      }

      // Обновляем статус заявки
      return tx.rentalApplication.update({
        where: { id },
        data: {
          status: RentalApplicationStatus.CANCELLED,
          notes: dto.reason ? `${application.notes || ''}\n\nПричина отмены: ${dto.reason}`.trim() : application.notes,
        },
        include: {
          room: true,
          client: true,
          manager: true,
          workspaces: { include: { workspace: true } },
          selectedDays: true,
          invoices: true,
          rentals: true,
        },
      });
    }, {
      maxWait: 5000,
      timeout: 30000,
    });
  }

  /**
   * Удаление заявки на аренду
   * - Блокирует если есть оплаченные счета
   * - Отменяет неоплаченные счета
   * - Удаляет Rental записи из расписания
   */
  async remove(id: string) {
    const application = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Проверяем оплаченные счета
      const paidInvoices = await tx.invoice.findMany({
        where: {
          rentalApplicationId: id,
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
        select: { invoiceNumber: true },
      });

      if (paidInvoices.length > 0) {
        const numbers = paidInvoices.map((i) => i.invoiceNumber).join(', ');
        throw new BadRequestException(
          `Невозможно удалить заявку: есть оплаченные счета (${numbers}). Сначала выполните возврат средств.`,
        );
      }

      // 2. Отменяем неоплаченные счета
      await tx.invoice.updateMany({
        where: {
          rentalApplicationId: id,
          status: { in: ['PENDING', 'OVERDUE', 'DRAFT'] },
        },
        data: { status: 'CANCELLED' },
      });

      // 3. Удаляем Rental записи (бронирования)
      await tx.rental.deleteMany({
        where: { rentalApplicationId: id },
      });

      // 4. Удаляем заявку (каскадно удалятся workspaces и days)
      return tx.rentalApplication.delete({ where: { id } });
    }, {
      maxWait: 5000,
      timeout: 30000,
    });
  }

  /**
   * Удаление отдельного Rental (слота) из заявки
   */
  async removeRental(applicationId: string, rentalId: string) {
    // Проверяем существование заявки
    const application = await this.findOne(applicationId);

    // Проверяем статус - удалять слоты можно только из DRAFT или CONFIRMED
    if (
      application.status !== RentalApplicationStatus.DRAFT &&
      application.status !== RentalApplicationStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Невозможно удалить слот: заявка в статусе "${application.status}". ` +
        'Удаление слотов возможно только для заявок в статусе "Черновик" или "Подтверждена".'
      );
    }

    // Проверяем что rental принадлежит заявке
    const rental = await this.prisma.rental.findFirst({
      where: {
        id: rentalId,
        rentalApplicationId: applicationId,
      },
    });

    if (!rental) {
      throw new NotFoundException('Слот не найден или не принадлежит данной заявке');
    }

    // Проверяем что это не последний слот
    const rentalsCount = await this.prisma.rental.count({
      where: { rentalApplicationId: applicationId },
    });

    if (rentalsCount <= 1) {
      throw new BadRequestException(
        'Невозможно удалить последний слот. Удалите всю заявку целиком.'
      );
    }

    // Удаляем слот и пересчитываем цены в транзакции
    return this.prisma.$transaction(async (tx) => {
      // Удаляем слот
      await tx.rental.delete({ where: { id: rentalId } });

      // Пересчитываем quantity и totalPrice
      const newQuantity = rentalsCount - 1;
      const basePrice = Number(application.adjustedPrice ?? application.basePrice);
      const newTotalPrice = basePrice * newQuantity;

      // Обновляем заявку
      await tx.rentalApplication.update({
        where: { id: applicationId },
        data: {
          quantity: newQuantity,
          totalPrice: newTotalPrice,
        },
      });

      // Возвращаем обновлённую заявку
      return tx.rentalApplication.findUnique({
        where: { id: applicationId },
        include: {
          room: { select: { id: true, name: true, number: true, hourlyRate: true } },
          client: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
          rentals: true,
          invoices: true,
        },
      });
    }, {
      maxWait: 5000,
      timeout: 30000,
    });
  }

  // === Вспомогательные методы ===

  /**
   * Проверка возможности редактирования заявки с учётом связанных счетов
   */
  private async checkEditability(applicationId: string): Promise<{
    canEdit: boolean;
    invoice?: any;
    reason?: string;
  }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        rentalApplicationId: applicationId,
        status: { not: 'CANCELLED' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!invoice) {
      return { canEdit: true };
    }

    if (invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') {
      return {
        canEdit: false,
        invoice,
        reason: `Невозможно редактировать: счёт ${invoice.invoiceNumber} ${
          invoice.status === 'PAID' ? 'оплачен' : 'частично оплачен'
        }`,
      };
    }

    return { canEdit: true, invoice };
  }

  /**
   * Получить статус возможности редактирования заявки
   */
  async getEditStatus(id: string): Promise<{
    canEdit: boolean;
    reason?: string;
    invoiceStatus?: string;
    invoiceNumber?: string;
  }> {
    const application = await this.findOne(id);

    if (application.status === RentalApplicationStatus.CANCELLED) {
      return { canEdit: false, reason: 'Заявка отменена' };
    }
    if (application.status === RentalApplicationStatus.COMPLETED) {
      return { canEdit: false, reason: 'Заявка завершена' };
    }
    if (application.status === RentalApplicationStatus.DRAFT) {
      return { canEdit: true };
    }

    const editCheck = await this.checkEditability(id);

    return {
      canEdit: editCheck.canEdit,
      reason: editCheck.reason,
      invoiceStatus: editCheck.invoice?.status,
      invoiceNumber: editCheck.invoice?.invoiceNumber,
    };
  }

  /**
   * Обновить позиции в связанном счёте при редактировании подтверждённой заявки
   */
  private async updateLinkedInvoice(
    invoiceId: string,
    application: any,
    dto: UpdateRentalApplicationDto,
  ): Promise<void> {
    const needsUpdate =
      dto.basePrice !== undefined ||
      dto.adjustedPrice !== undefined ||
      dto.quantity !== undefined ||
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.selectedDays !== undefined ||
      dto.workspaceIds !== undefined ||
      dto.roomId !== undefined;

    if (!needsUpdate) return;

    const room =
      application.room ||
      (application.roomId
        ? await this.prisma.room.findUnique({ where: { id: application.roomId } })
        : null);

    const newBasePrice =
      dto.adjustedPrice ?? dto.basePrice ?? Number(application.adjustedPrice ?? application.basePrice);
    const newQuantity = dto.quantity ?? Number(application.quantity);
    const totalPrice = newBasePrice * newQuantity;

    await this.prisma.$transaction(async (tx) => {
      // Удалить старые позиции
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });

      // Создать новую позицию с обновлёнными данными
      await tx.invoiceItem.create({
        data: {
          invoiceId,
          serviceType: 'RENTAL',
          serviceName: this.getInvoiceItemName(application, room),
          serviceDescription: this.getInvoiceItemDescription({
            ...application,
            startDate: dto.startDate ? new Date(dto.startDate) : application.startDate,
            endDate: dto.endDate ? new Date(dto.endDate) : application.endDate,
            startTime: dto.startTime ? this.timeStringToDate(dto.startTime) : application.startTime,
            endTime: dto.endTime ? this.timeStringToDate(dto.endTime) : application.endTime,
          }),
          roomId: dto.roomId ?? application.roomId,
          quantity: newQuantity,
          basePrice: newBasePrice,
          unitPrice: newBasePrice,
          vatRate: 0,
          vatAmount: 0,
          discountPercent: 0,
          discountAmount: 0,
          totalPrice,
          writeOffTiming: 'ON_SALE',
          isPriceAdjusted: !!(dto.adjustedPrice || application.adjustedPrice),
          adjustmentReason: dto.adjustmentReason ?? application.adjustmentReason,
        },
      });

      // Обновить суммы счёта
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { subtotal: totalPrice, totalAmount: totalPrice },
      });
    }, {
      maxWait: 5000,
      timeout: 30000,
    });
  }

  private timeStringToDate(time: string): Date {
    const [hour, min] = time.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hour, min, 0));
  }

  private dateToTimeString(date: Date): string {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private calculateDaysCount(
    periodType: RentalPeriodType,
    startDate: string,
    endDate?: string,
    selectedDays?: string[],
  ): number {
    if (periodType === RentalPeriodType.SPECIFIC_DAYS && selectedDays?.length) {
      return selectedDays.length;
    }

    if (!endDate) return 1;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private calculateWeeksCount(startDate: string, endDate?: string): number {
    if (!endDate) return 1;

    const days = this.calculateDaysCount(RentalPeriodType.SPECIFIC_DAYS, startDate, endDate);
    return Math.ceil(days / 7);
  }

  private calculateMonthsCount(periodType: RentalPeriodType, startDate: string, endDate?: string): number {
    if (!endDate) return 1;

    if (periodType === RentalPeriodType.SLIDING_MONTH) {
      // Для скользящего месяца всегда 1 месяц (30 дней от даты начала)
      return 1;
    }

    // Календарные месяцы
    const start = new Date(startDate);
    const end = new Date(endDate);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  }

  private getDatesToCheck(
    periodType: RentalPeriodType,
    startDate: string,
    endDate?: string,
    selectedDays?: string[],
  ): string[] {
    if (periodType === RentalPeriodType.SPECIFIC_DAYS && selectedDays?.length) {
      return selectedDays;
    }

    const dates: string[] = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;

    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private getRentalTypeLabel(type: RentalType): string {
    const labels: Record<RentalType, string> = {
      HOURLY: 'Почасовая аренда',
      WORKSPACE_DAILY: 'Рабочее место (день)',
      WORKSPACE_WEEKLY: 'Рабочее место (неделя)',
      WORKSPACE_MONTHLY: 'Рабочее место (месяц)',
      ROOM_DAILY: 'Кабинет (день)',
      ROOM_WEEKLY: 'Кабинет (неделя)',
      ROOM_MONTHLY: 'Кабинет (месяц)',
    };
    return labels[type] || type;
  }

  private getInvoiceItemName(application: any, room: any): string {
    const typeName = this.getRentalTypeLabel(application.rentalType);
    const roomName = room ? `${room.name}${room.number ? ` №${room.number}` : ''}` : '';

    if (application.workspaces?.length) {
      const workspaceNames = application.workspaces.map((w: any) => w.workspace.name).join(', ');
      return `${typeName}: ${workspaceNames}`;
    }

    return `${typeName}: ${roomName}`;
  }

  private getInvoiceItemDescription(application: any): string {
    const startDate = application.startDate.toLocaleDateString('ru-RU');
    const endDate = application.endDate?.toLocaleDateString('ru-RU');

    let period = startDate;
    if (endDate && endDate !== startDate) {
      period = `${startDate} - ${endDate}`;
    }

    if (application.startTime && application.endTime) {
      const startTime = this.dateToTimeString(application.startTime);
      const endTime = this.dateToTimeString(application.endTime);
      period += ` (${startTime}-${endTime})`;
    }

    return `Заявка ${application.applicationNumber}. Период: ${period}`;
  }
}
