import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ScheduleType, CalendarEventStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  PreviewRecurringScheduleDto,
  PreviewGroupDto,
  PreviewResult,
  PreviewScheduleItem,
  ConflictInfo,
  WeeklyScheduleItemDto,
} from './dto/preview-recurring-schedule.dto';
import {
  BulkCreateRecurringDto,
  BulkCreateResult,
  BulkScheduleItemDto,
} from './dto/bulk-create-recurring.dto';

// Маппинг дней недели: строковое представление -> число (0=ВС, 1=ПН, ..., 6=СБ)
const DAY_TO_NUMBER: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

@Injectable()
export class SchedulePlannerService {
  private readonly logger = new Logger(SchedulePlannerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Preview создания расписания для нескольких групп
   * НЕ сохраняет данные в БД
   */
  async previewRecurring(dto: PreviewRecurringScheduleDto): Promise<PreviewResult> {
    const schedules: PreviewScheduleItem[] = [];
    const summary: PreviewResult['summary'] = {
      total: 0,
      withConflicts: 0,
      byGroup: {},
    };

    // Получаем информацию о группах, преподавателях и помещениях
    const groupIds = dto.groups.map(g => g.groupId);
    const teacherIds = [...new Set(dto.groups.map(g => g.teacherId))];
    const roomIds = [...new Set(dto.groups.flatMap(g => {
      const ids = [g.roomId];
      g.weeklySchedule.forEach(ws => {
        if (ws.roomId) ids.push(ws.roomId);
      });
      return ids;
    }))];

    const [groups, teachers, rooms] = await Promise.all([
      this.prisma.group.findMany({
        where: { id: { in: groupIds } },
        select: { id: true, name: true },
      }),
      this.prisma.teacher.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, name: true, number: true },
      }),
    ]);

    const groupMap = new Map(groups.map(g => [g.id, g.name]));
    const teacherMap = new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`]));
    const roomMap = new Map(rooms.map(r => [r.id, r.name || `Зал ${r.number}`]));

    // Парсим месяц
    const [year, month] = dto.month.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Последний день месяца

    // Для каждой группы генерируем занятия
    for (const group of dto.groups) {
      const groupName = groupMap.get(group.groupId) || 'Неизвестная группа';
      const teacherName = teacherMap.get(group.teacherId) || 'Неизвестный преподаватель';

      summary.byGroup[group.groupId] = {
        total: 0,
        conflicts: 0,
        groupName,
      };

      // Генерируем даты по паттерну
      const generatedSchedules = this.generateSchedulesFromPattern(
        group,
        startDate,
        endDate,
        groupName,
        teacherName,
        roomMap,
      );

      // Проверяем конфликты для каждого занятия
      for (const schedule of generatedSchedules) {
        const conflicts = await this.checkConflictsForSchedule(
          schedule.date,
          schedule.startTime,
          schedule.endTime,
          schedule.roomId,
          group.teacherId,
        );

        schedule.hasConflict = conflicts.length > 0;
        schedule.conflicts = conflicts;

        schedules.push(schedule);
        summary.total++;
        summary.byGroup[group.groupId].total++;

        if (schedule.hasConflict) {
          summary.withConflicts++;
          summary.byGroup[group.groupId].conflicts++;
        }
      }
    }

    // Сортируем по дате и времени
    schedules.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return { schedules, summary };
  }

  /**
   * Генерация занятий из паттерна для одной группы
   */
  private generateSchedulesFromPattern(
    group: PreviewGroupDto,
    startDate: Date,
    endDate: Date,
    groupName: string,
    teacherName: string,
    roomMap: Map<string, string>,
  ): PreviewScheduleItem[] {
    const schedules: PreviewScheduleItem[] = [];

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Ищем совпадение с паттерном
      for (const pattern of group.weeklySchedule) {
        if (DAY_TO_NUMBER[pattern.day] === dayOfWeek) {
          const roomId = pattern.roomId || group.roomId;
          const endTime = this.calculateEndTime(pattern.startTime, group.duration);

          schedules.push({
            tempId: uuidv4(),
            groupId: group.groupId,
            groupName,
            date: this.formatDate(currentDate),
            startTime: pattern.startTime,
            endTime,
            roomId,
            roomName: roomMap.get(roomId) || 'Неизвестный зал',
            teacherId: group.teacherId,
            teacherName,
            hasConflict: false,
            conflicts: [],
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedules;
  }

  /**
   * Проверка конфликтов для конкретного занятия (без сохранения в БД)
   */
  private async checkConflictsForSchedule(
    dateStr: string,
    startTime: string,
    endTime: string,
    roomId: string,
    teacherId: string,
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    const checkDate = new Date(dateStr);

    // Параллельно загружаем все потенциально конфликтующие события
    const [schedules, rentals, events, teacherSchedules] = await Promise.all([
      // 1. Занятия в этой комнате
      this.prisma.schedule.findMany({
        where: {
          date: checkDate,
          roomId,
          status: { not: 'CANCELLED' },
        },
        include: {
          group: { select: { name: true } },
        },
      }),
      // 2. Аренда в этой комнате
      this.prisma.rental.findMany({
        where: {
          date: checkDate,
          roomId,
          status: { not: 'CANCELLED' },
        },
      }),
      // 3. Мероприятия в этой комнате
      this.prisma.event.findMany({
        where: {
          date: checkDate,
          roomId,
          status: { not: 'CANCELLED' },
        },
        include: {
          eventType: { select: { name: true } },
        },
      }),
      // 4. Занятия преподавателя
      this.prisma.schedule.findMany({
        where: {
          date: checkDate,
          teacherId,
          status: { not: 'CANCELLED' },
        },
      }),
    ]);

    // Проверяем конфликты по комнате (Schedule)
    for (const schedule of schedules) {
      const scheduleStart = this.extractTimeString(schedule.startTime);
      const scheduleEnd = this.extractTimeString(schedule.endTime);

      if (this.checkTimeOverlap(startTime, endTime, scheduleStart, scheduleEnd)) {
        const groupInfo = schedule.group ? ` (${schedule.group.name})` : '';
        conflicts.push({
          type: 'room',
          reason: `Комната занята занятием${groupInfo}: ${scheduleStart}-${scheduleEnd}`,
        });
      }
    }

    // Проверяем конфликты с арендой
    for (const rental of rentals) {
      const rentalStart = this.extractTimeString(rental.startTime);
      const rentalEnd = this.extractTimeString(rental.endTime);

      if (this.checkTimeOverlap(startTime, endTime, rentalStart, rentalEnd)) {
        conflicts.push({
          type: 'rental',
          reason: `Комната сдана в аренду: ${rentalStart}-${rentalEnd}`,
        });
      }
    }

    // Проверяем конфликты с мероприятиями
    for (const event of events) {
      const eventStart = this.extractTimeString(event.startTime);
      const eventEnd = this.extractTimeString(event.endTime);

      if (this.checkTimeOverlap(startTime, endTime, eventStart, eventEnd)) {
        const eventInfo = event.eventType ? ` (${event.eventType.name})` : '';
        conflicts.push({
          type: 'event',
          reason: `Мероприятие "${event.name}"${eventInfo}: ${eventStart}-${eventEnd}`,
        });
      }
    }

    // Проверяем конфликты преподавателя
    for (const schedule of teacherSchedules) {
      const scheduleStart = this.extractTimeString(schedule.startTime);
      const scheduleEnd = this.extractTimeString(schedule.endTime);

      if (this.checkTimeOverlap(startTime, endTime, scheduleStart, scheduleEnd)) {
        conflicts.push({
          type: 'teacher',
          reason: `Преподаватель занят: ${scheduleStart}-${scheduleEnd}`,
        });
      }
    }

    return conflicts;
  }

  /**
   * Массовое создание занятий (оптимизированная версия с batch операциями)
   */
  async bulkCreateRecurring(dto: BulkCreateRecurringDto): Promise<BulkCreateResult> {
    const created: any[] = [];
    const failed: Array<{ schedule: BulkScheduleItemDto; reason: string }> = [];

    // Валидация и подготовка данных
    const validSchedules: Array<{
      dto: BulkScheduleItemDto;
      data: Prisma.ScheduleCreateManyInput;
    }> = [];

    for (const scheduleDto of dto.schedules) {
      try {
        const [startHour, startMin] = scheduleDto.startTime.split(':').map(Number);
        const [endHour, endMin] = scheduleDto.endTime.split(':').map(Number);

        validSchedules.push({
          dto: scheduleDto,
          data: {
            groupId: scheduleDto.groupId,
            teacherId: scheduleDto.teacherId,
            roomId: scheduleDto.roomId,
            date: new Date(scheduleDto.date),
            startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
            endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
            type: ScheduleType.GROUP_CLASS,
            isRecurring: false,
            status: CalendarEventStatus.PLANNED,
          },
        });
      } catch (error) {
        failed.push({
          schedule: scheduleDto,
          reason: error.message || 'Invalid schedule data',
        });
      }
    }

    if (validSchedules.length === 0) {
      return {
        created: { count: 0, schedules: [] },
        failed: { count: failed.length, errors: failed },
      };
    }

    // Используем транзакцию для batch создания (быстрая операция)
    try {
      const transactionResult = await this.prisma.$transaction(async (tx) => {
        // Создаём все расписания одним batch запросом (createManyAndReturn доступен в Prisma 5.14+)
        const createdSchedules = await tx.schedule.createManyAndReturn({
          data: validSchedules.map(v => v.data),
        });

        // Получаем созданные расписания с связанными данными
        const schedulesWithRelations = await tx.schedule.findMany({
          where: { id: { in: createdSchedules.map(s => s.id) } },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                studio: { select: { id: true, name: true } },
              },
            },
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
            room: {
              select: { id: true, name: true, number: true },
            },
          },
        });

        // Создаём map для быстрого поиска
        const scheduleMap = new Map(
          schedulesWithRelations.map(s => [
            `${s.groupId}-${s.date.toISOString()}-${s.startTime.toISOString()}`,
            s,
          ])
        );

        return { schedulesWithRelations, scheduleMap };
      }, {
        maxWait: 5000,
        timeout: 30000, // 30 секунд - транзакция теперь быстрее
      });

      // Автозапись клиентов ПОСЛЕ транзакции (не блокирует основную операцию)
      const enrollmentResults: Map<string, number> = new Map();

      if (dto.autoEnrollClients) {
        for (const schedule of transactionResult.schedulesWithRelations) {
          try {
            const enrolled = await this.enrollClientsToSchedule(
              schedule.id,
              schedule.groupId,
              schedule.date,
            );
            enrollmentResults.set(schedule.id, enrolled);
          } catch (enrollError) {
            // Логируем ошибку, но не прерываем процесс - schedules уже созданы
            this.logger.warn(
              `Failed to auto-enroll clients for schedule ${schedule.id}: ${(enrollError as Error).message}`,
            );
            enrollmentResults.set(schedule.id, 0);
          }
        }
      }

      const results = { ...transactionResult, enrollmentResults };

      // Формируем результат
      for (const validSchedule of validSchedules) {
        // Приводим типы, т.к. мы всегда передаём Date объекты
        const date = validSchedule.data.date as Date;
        const startTime = validSchedule.data.startTime as Date;
        const key = `${validSchedule.data.groupId}-${date.toISOString()}-${startTime.toISOString()}`;
        const schedule = results.scheduleMap.get(key);

        if (schedule) {
          const enrolledClients = results.enrollmentResults.get(schedule.id) || 0;
          created.push({ ...schedule, enrolledClients });
        } else {
          failed.push({
            schedule: validSchedule.dto,
            reason: 'Schedule not found after creation',
          });
        }
      }
    } catch (error) {
      // Если транзакция провалилась, помечаем все как failed
      for (const validSchedule of validSchedules) {
        failed.push({
          schedule: validSchedule.dto,
          reason: error.message || 'Transaction failed',
        });
      }
    }

    return {
      created: {
        count: created.length,
        schedules: created,
      },
      failed: {
        count: failed.length,
        errors: failed,
      },
    };
  }

  /**
   * Получить запланированные занятия с фильтрами
   */
  async getPlannedSchedules(params: {
    status?: string;
    year?: number;
    month?: number;
    groupIds?: string[];
  }) {
    const where: any = {
      // Только групповые занятия
      groupId: { not: null },
    };

    // Фильтр по статусу (если указан)
    if (params.status) {
      where.status = params.status;
    }

    // Фильтр по дате (год + месяц) - используем UTC для корректного сравнения
    if (params.year && params.month) {
      // Первый день месяца 00:00:00 UTC
      const startDate = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0, 0));
      // Последний день месяца 23:59:59 UTC
      const lastDay = new Date(Date.UTC(params.year, params.month, 0)).getUTCDate();
      const endDate = new Date(Date.UTC(params.year, params.month - 1, lastDay, 23, 59, 59, 999));
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (params.year) {
      const startDate = new Date(Date.UTC(params.year, 0, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(params.year, 11, 31, 23, 59, 59, 999));
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Фильтр по группам
    if (params.groupIds && params.groupIds.length > 0) {
      where.groupId = { in: params.groupIds };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            studio: { select: { id: true, name: true } },
          },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        room: {
          select: { id: true, name: true, number: true },
        },
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return schedules;
  }

  /**
   * Получить статистику по месяцам с запланированными занятиями
   */
  async getPlannedMonthsStats(groupIds?: string[]) {
    const where: any = {
      // Только групповые занятия
      groupId: { not: null },
    };

    if (groupIds && groupIds.length > 0) {
      where.groupId = { in: groupIds };
    }

    const schedules = await this.prisma.schedule.groupBy({
      by: ['date'],
      where,
      _count: true,
    });

    // Группируем по году-месяцу
    const monthStats = new Map<string, number>();
    for (const s of schedules) {
      const date = new Date(s.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthStats.set(yearMonth, (monthStats.get(yearMonth) || 0) + s._count);
    }

    return Array.from(monthStats.entries())
      .map(([yearMonth, count]) => ({ yearMonth, count }))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }

  /**
   * Автоматическая запись клиентов группы на занятие
   */
  private async enrollClientsToSchedule(
    scheduleId: string,
    groupId: string,
    scheduleDate: Date,
  ): Promise<number> {
    return this.enrollClientsToScheduleInTransaction(
      this.prisma,
      scheduleId,
      groupId,
      scheduleDate,
    );
  }

  /**
   * Автоматическая запись клиентов группы на занятие (внутри транзакции)
   * Использует переданный клиент Prisma для поддержки транзакций
   */
  private async enrollClientsToScheduleInTransaction(
    tx: Prisma.TransactionClient,
    scheduleId: string,
    groupId: string,
    scheduleDate: Date,
  ): Promise<number> {
    const scheduleMonth = this.formatMonth(scheduleDate);

    const activeSubscriptions = await tx.subscription.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
        validMonth: scheduleMonth,
      },
      include: {
        client: true,
      },
    });

    if (activeSubscriptions.length === 0) {
      return 0;
    }

    // Use createMany for batch insert (instead of N+1 queries)
    await tx.attendance.createMany({
      data: activeSubscriptions.map((subscription) => ({
        scheduleId,
        clientId: subscription.clientId,
        status: 'PRESENT',
        subscriptionDeducted: false,
      })),
      skipDuplicates: true,
    });

    return activeSubscriptions.length;
  }

  // Вспомогательные методы

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private extractTimeString(dateTime: Date): string {
    const hours = dateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private checkTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Min = toMinutes(start1);
    const end1Min = toMinutes(end1);
    const start2Min = toMinutes(start2);
    const end2Min = toMinutes(end2);

    return start1Min < end2Min && end1Min > start2Min;
  }
}
