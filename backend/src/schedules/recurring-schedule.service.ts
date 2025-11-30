import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { CreateRecurringScheduleDto } from './dto/create-recurring-schedule.dto';
import { RecurrenceRuleDto } from './dto/recurrence-rule.dto';
import { Prisma } from '@prisma/client';

export interface CreateRecurringResult {
  created: {
    count: number;
    schedule: any[];
  };
  skipped: {
    count: number;
    conflicts: any[];
  };
}

@Injectable()
export class RecurringScheduleService {
  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
  ) {}

  /**
   * Создать серию повторяющихся занятий
   * Использует транзакцию для атомарности и предотвращения race conditions
   */
  async createRecurring(
    dto: CreateRecurringScheduleDto,
    createdBy?: string,
  ): Promise<CreateRecurringResult> {
    // 1. Валидация сущностей
    await this.validateEntities(dto.groupId, dto.teacherId, dto.roomId);

    // 2. Генерировать даты по правилу
    const dates = this.generateDates(dto.recurrenceRule);

    if (dates.length === 0) {
      throw new BadRequestException('No dates generated from recurrence rule');
    }

    // 3. Создать занятия с проверкой конфликтов (в транзакции)
    const results = await this.createSchedulesWithConflictCheck(dto, dates);

    // 4. Если все даты конфликтуют - ошибка с подробностями
    if (results.created.length === 0) {
      // Собираем информацию о конфликтах для понятного сообщения
      const conflictSummary = this.buildConflictSummary(results.skipped);
      throw new BadRequestException(
        `Невозможно создать занятия - все выбранные даты имеют конфликты:\n${conflictSummary}`
      );
    }

    return {
      created: {
        count: results.created.length,
        schedule: results.created,
      },
      skipped: {
        count: results.skipped.length,
        conflicts: results.skipped,
      },
    };
  }

  /**
   * Валидация существования связанных сущностей
   */
  private async validateEntities(groupId: string, teacherId: string, roomId: string) {
    const [group, teacher, room] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId } }),
      this.prisma.teacher.findUnique({ where: { id: teacherId } }),
      this.prisma.room.findUnique({ where: { id: roomId } }),
    ]);

    if (!group) {
      throw new BadRequestException(`Group with ID ${groupId} not found`);
    }
    if (!teacher) {
      throw new BadRequestException(`Teacher with ID ${teacherId} not found`);
    }
    if (!room) {
      throw new BadRequestException(`Room with ID ${roomId} not found`);
    }
  }

  /**
   * Генерировать даты по правилу повторения
   */
  private generateDates(rule: RecurrenceRuleDto): Date[] {
    const dates: Date[] = [];
    const startDate = new Date(rule.startDate);
    const endDate = new Date(rule.endDate);

    // Проверка корректности дат
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Ограничение на 1 год
    const oneYearLater = new Date(startDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    if (endDate > oneYearLater) {
      throw new BadRequestException('Cannot create recurring schedule for more than 1 year');
    }

    // Проверка хотя бы один день недели выбран
    if (!rule.daysOfWeek || rule.daysOfWeek.length === 0) {
      throw new BadRequestException('At least one day of week must be selected');
    }

    // Генерация дат
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (rule.daysOfWeek.includes(dayOfWeek)) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Создать занятия с проверкой конфликтов
   * Использует транзакцию с блокировкой для предотвращения race conditions
   */
  private async createSchedulesWithConflictCheck(
    dto: CreateRecurringScheduleDto,
    dates: Date[],
  ) {
    const created: any[] = [];
    const skipped: any[] = [];

    const [startHour, startMin] = dto.recurrenceRule.time.start.split(':').map(Number);
    const [endHour, endMin] = dto.recurrenceRule.time.end.split(':').map(Number);

    // Обрабатываем каждую дату в транзакции для атомарности
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0];

      try {
        // Используем транзакцию с уровнем изоляции SERIALIZABLE для предотвращения race conditions
        const result = await this.prisma.$transaction(async (tx) => {
          // В режиме SERIALIZABLE блокировка происходит автоматически

          // 1. Проверяем конфликты
          const hasConflict = await this.checkConflictForDateInTransaction(
            tx,
            dateStr,
            dto.recurrenceRule.time.start,
            dto.recurrenceRule.time.end,
            dto.roomId,
            dto.teacherId,
          );

          if (hasConflict) {
            return { type: 'skipped', data: hasConflict };
          }

          // 3. Создаём занятие
          const schedule = await tx.schedule.create({
            data: {
              groupId: dto.groupId,
              teacherId: dto.teacherId,
              roomId: dto.roomId,
              date,
              startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
              endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
              type: dto.type || 'GROUP_CLASS',
              isRecurring: false,
              status: 'PLANNED',
            },
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  studio: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              teacher: {
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

          return { type: 'created', data: schedule };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 10000, // 10 секунд таймаут
        });

        if (result.type === 'created') {
          // Автозапись клиентов (вне транзакции)
          let enrolledClients = 0;
          if (dto.autoEnrollClients) {
            enrolledClients = await this.enrollClientsToSchedule(result.data.id, dto.groupId, date);
          }

          created.push({
            ...result.data,
            enrolledClients,
          });
        } else {
          skipped.push({
            date: dateStr,
            reason: result.data.reason,
            conflictType: result.data.type,
            conflictingEvent: result.data.event,
          });
        }
      } catch (error) {
        // В случае ошибки транзакции (deadlock, timeout) пропускаем дату
        skipped.push({
          date: dateStr,
          reason: `Transaction error: ${error.message}`,
          conflictType: 'error',
          conflictingEvent: null,
        });
      }
    }

    return { created, skipped };
  }

  /**
   * Проверка конфликта для конкретной даты (внутри транзакции)
   */
  private async checkConflictForDateInTransaction(
    tx: Prisma.TransactionClient,
    date: string,
    startTime: string,
    endTime: string,
    roomId: string,
    teacherId: string,
  ): Promise<any | null> {
    const checkDate = new Date(date);

    // Проверяем конфликты в Schedule
    const schedules = await tx.schedule.findMany({
      where: {
        date: checkDate,
        roomId,
        status: { not: 'CANCELLED' },
      },
      include: {
        group: { select: { name: true } },
        room: { select: { name: true } },
      },
    });

    for (const schedule of schedules) {
      const scheduleStart = this.extractTimeString(schedule.startTime);
      const scheduleEnd = this.extractTimeString(schedule.endTime);

      if (this.checkTimeOverlap(startTime, endTime, scheduleStart, scheduleEnd)) {
        const groupInfo = schedule.group
          ? ` (группа: ${schedule.group.name})`
          : ' (индивидуальное занятие)';
        const roomInfo = schedule.room ? ` в комнате "${schedule.room.name}"` : '';
        return {
          reason: `Комната уже занята занятием${groupInfo}${roomInfo} в это время: ${scheduleStart} - ${scheduleEnd}`,
          type: 'room',
          event: schedule,
        };
      }
    }

    // Проверяем конфликты преподавателя
    const teacherSchedules = await tx.schedule.findMany({
      where: {
        date: checkDate,
        teacherId,
        status: { not: 'CANCELLED' },
      },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    for (const schedule of teacherSchedules) {
      const scheduleStart = this.extractTimeString(schedule.startTime);
      const scheduleEnd = this.extractTimeString(schedule.endTime);

      if (this.checkTimeOverlap(startTime, endTime, scheduleStart, scheduleEnd)) {
        return {
          reason: `Преподаватель ${schedule.teacher.firstName} ${schedule.teacher.lastName} уже занят в это время: ${scheduleStart} - ${scheduleEnd}`,
          type: 'teacher',
          event: schedule,
        };
      }
    }

    // Проверяем конфликты с арендой
    const rentals = await tx.rental.findMany({
      where: {
        date: checkDate,
        roomId,
        status: { not: 'CANCELLED' },
      },
      include: {
        room: { select: { name: true } },
      },
    });

    for (const rental of rentals) {
      const rentalStart = this.extractTimeString(rental.startTime);
      const rentalEnd = this.extractTimeString(rental.endTime);

      if (this.checkTimeOverlap(startTime, endTime, rentalStart, rentalEnd)) {
        const roomInfo = rental.room ? ` в комнате "${rental.room.name}"` : '';
        return {
          reason: `Комната${roomInfo} уже сдана в аренду в это время: ${rentalStart} - ${rentalEnd}`,
          type: 'rental',
          event: rental,
        };
      }
    }

    // Проверяем конфликты с мероприятиями
    const events = await tx.event.findMany({
      where: {
        date: checkDate,
        roomId,
        status: { not: 'CANCELLED' },
      },
      include: {
        eventType: { select: { name: true } },
        room: { select: { name: true } },
      },
    });

    for (const event of events) {
      const eventStart = this.extractTimeString(event.startTime);
      const eventEnd = this.extractTimeString(event.endTime);

      if (this.checkTimeOverlap(startTime, endTime, eventStart, eventEnd)) {
        const eventInfo = event.eventType ? ` (${event.eventType.name})` : '';
        const roomInfo = event.room ? ` в комнате "${event.room.name}"` : '';
        return {
          reason: `Комната${roomInfo} уже занята мероприятием "${event.name}"${eventInfo} в это время: ${eventStart} - ${eventEnd}`,
          type: 'event',
          event: event,
        };
      }
    }

    return null; // Нет конфликтов
  }

  /**
   * Извлечение строки времени в формате HH:MM из Date объекта
   */
  private extractTimeString(dateTime: Date): string {
    const hours = dateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Проверка пересечения двух временных диапазонов
   */
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

  /**
   * Автоматическая запись клиентов группы на занятие
   */
  private async enrollClientsToSchedule(
    scheduleId: string,
    groupId: string,
    scheduleDate: Date,
  ): Promise<number> {
    // 1. Получить список клиентов группы (через Subscription)
    const scheduleMonth = this.formatMonth(scheduleDate);

    const activeSubscriptions = await this.prisma.subscription.findMany({
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

    let enrolledCount = 0;

    for (const subscription of activeSubscriptions) {
      // Создать запись Attendance
      await this.prisma.attendance.create({
        data: {
          scheduleId,
          clientId: subscription.clientId,
          status: 'PRESENT',
          subscriptionDeducted: false, // Списание только при отметке преподавателем
        },
      });

      enrolledCount++;
    }

    return enrolledCount;
  }

  /**
   * Форматировать дату в формат месяца (YYYY-MM)
   */
  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Сформировать понятную сводку конфликтов для сообщения об ошибке
   */
  private buildConflictSummary(skipped: any[]): string {
    if (skipped.length === 0) {
      return 'Нет данных о конфликтах';
    }

    // Группируем по типу конфликта для более компактного вывода
    const byType: Record<string, string[]> = {};

    for (const item of skipped) {
      const type = item.conflictType || 'unknown';
      if (!byType[type]) {
        byType[type] = [];
      }

      const formattedDate = this.formatDateRussian(item.date);
      byType[type].push(`${formattedDate}: ${item.reason}`);
    }

    const lines: string[] = [];

    // Выводим первые несколько конфликтов каждого типа
    const maxPerType = 3;

    if (byType['room']) {
      lines.push('• Конфликты по комнате:');
      byType['room'].slice(0, maxPerType).forEach(msg => lines.push(`  - ${msg}`));
      if (byType['room'].length > maxPerType) {
        lines.push(`  ... и ещё ${byType['room'].length - maxPerType} конфликт(ов)`);
      }
    }

    if (byType['teacher']) {
      lines.push('• Конфликты по преподавателю:');
      byType['teacher'].slice(0, maxPerType).forEach(msg => lines.push(`  - ${msg}`));
      if (byType['teacher'].length > maxPerType) {
        lines.push(`  ... и ещё ${byType['teacher'].length - maxPerType} конфликт(ов)`);
      }
    }

    if (byType['rental']) {
      lines.push('• Конфликты с арендой:');
      byType['rental'].slice(0, maxPerType).forEach(msg => lines.push(`  - ${msg}`));
      if (byType['rental'].length > maxPerType) {
        lines.push(`  ... и ещё ${byType['rental'].length - maxPerType} конфликт(ов)`);
      }
    }

    if (byType['event']) {
      lines.push('• Конфликты с мероприятиями:');
      byType['event'].slice(0, maxPerType).forEach(msg => lines.push(`  - ${msg}`));
      if (byType['event'].length > maxPerType) {
        lines.push(`  ... и ещё ${byType['event'].length - maxPerType} конфликт(ов)`);
      }
    }

    if (byType['error']) {
      lines.push('• Ошибки при проверке:');
      byType['error'].slice(0, maxPerType).forEach(msg => lines.push(`  - ${msg}`));
      if (byType['error'].length > maxPerType) {
        lines.push(`  ... и ещё ${byType['error'].length - maxPerType} ошибок`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Форматировать дату в русском формате (дд.мм.гггг)
   */
  private formatDateRussian(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr;
    }
  }
}
