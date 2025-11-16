import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { CreateRecurringScheduleDto } from './dto/create-recurring-schedule.dto';
import { RecurrenceRuleDto } from './dto/recurrence-rule.dto';

interface GeneratedDate {
  date: Date;
  conflicts: any[];
}

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
   */
  async createRecurring(
    dto: CreateRecurringScheduleDto,
    createdBy?: string,
  ): Promise<CreateRecurringResult> {
    // 1. Валидация
    await this.validateEntities(dto.groupId, dto.teacherId, dto.roomId);

    // 2. Генерировать даты по правилу
    const dates = this.generateDates(dto.recurrenceRule);

    if (dates.length === 0) {
      throw new BadRequestException('No dates generated from recurrence rule');
    }

    // 3. Создать родительскую запись
    const parentSchedule = await this.createParentSchedule(dto, );

    // 4. Проверить конфликты и создать дочерние записи
    const results = await this.createChildSchedules(dto, parentSchedule.id, dates, );

    // 5. Если все даты конфликтуют - ошибка
    if (results.created.length === 0) {
      await this.prisma.schedule.delete({ where: { id: parentSchedule.id } });
      throw new BadRequestException('Cannot create any schedules - all dates have conflicts');
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
   * Создать родительскую запись
   */
  private async createParentSchedule(dto: CreateRecurringScheduleDto, createdBy?: string) {
    const [startHour, startMin] = dto.recurrenceRule.time.start.split(':').map(Number);
    const [endHour, endMin] = dto.recurrenceRule.time.end.split(':').map(Number);

    return this.prisma.schedule.create({
      data: {
        groupId: dto.groupId,
        teacherId: dto.teacherId,
        roomId: dto.roomId,
        date: new Date(dto.recurrenceRule.startDate),
        startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
        endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
        type: dto.type || 'GROUP_CLASS',
        isRecurring: true,
        recurrenceRule: JSON.stringify(dto.recurrenceRule),
        status: 'PLANNED',
        },
    });
  }

  /**
   * Создать дочерние записи с проверкой конфликтов
   */
  private async createChildSchedules(
    dto: CreateRecurringScheduleDto,
    parentId: string,
    dates: Date[],
    createdBy?: string,
  ) {
    const created: any[] = [];
    const skipped: any[] = [];

    const [startHour, startMin] = dto.recurrenceRule.time.start.split(':').map(Number);
    const [endHour, endMin] = dto.recurrenceRule.time.end.split(':').map(Number);

    for (const date of dates) {
      // Проверка конфликтов
      const dateStr = date.toISOString().split('T')[0];
      const hasConflict = await this.checkConflictForDate(
        dateStr,
        dto.recurrenceRule.time.start,
        dto.recurrenceRule.time.end,
        dto.roomId,
        dto.teacherId,
      );

      if (hasConflict) {
        skipped.push({
          date: dateStr,
          reason: hasConflict.reason,
          conflictType: hasConflict.type,
          conflictingEvent: hasConflict.event,
        });
        continue;
      }

      // Создать занятие
      const schedule = await this.prisma.schedule.create({
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

      // Автозапись клиентов
      let enrolledClients = 0;
      if (dto.autoEnrollClients) {
        enrolledClients = await this.enrollClientsToSchedule(schedule.id, dto.groupId, date);
      }

      created.push({
        ...schedule,
        enrolledClients,
      });
    }

    return { created, skipped };
  }

  /**
   * Проверка конфликта для конкретной даты
   */
  private async checkConflictForDate(
    date: string,
    startTime: string,
    endTime: string,
    roomId: string,
    teacherId: string,
  ): Promise<any | null> {
    try {
      await this.conflictChecker.checkConflicts({
        date,
        startTime,
        endTime,
        roomIds: [roomId],
        teacherId,
      });
      return null; // Нет конфликта
    } catch (error) {
      // Есть конфликт
      return {
        reason: error.message,
        type: error.message.includes('Room') ? 'room' : 'teacher',
        event: null, // TODO: извлечь детали конфликтующего события
      };
    }
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
}
