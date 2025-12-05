import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { NotificationsService } from '../notifications/notifications.service';
import { updateWithVersionCheck } from '../common/utils/optimistic-lock.util';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createScheduleDto: CreateScheduleDto) {
    // Параллельная валидация существования связанных сущностей (оптимизация N+1)
    const [group, teacher, room] = await Promise.all([
      createScheduleDto.groupId
        ? this.prisma.group.findUnique({ where: { id: createScheduleDto.groupId } })
        : Promise.resolve(null),
      this.prisma.teacher.findUnique({ where: { id: createScheduleDto.teacherId } }),
      this.prisma.room.findUnique({ where: { id: createScheduleDto.roomId } }),
    ]);

    // Валидация результатов
    if (createScheduleDto.groupId && !group) {
      throw new BadRequestException(`Group with ID ${createScheduleDto.groupId} not found`);
    }
    if (!teacher) {
      throw new BadRequestException(`Teacher with ID ${createScheduleDto.teacherId} not found`);
    }
    if (!room) {
      throw new BadRequestException(`Room with ID ${createScheduleDto.roomId} not found`);
    }

    // Check for conflicts
    await this.conflictChecker.checkConflicts({
      date: createScheduleDto.date,
      startTime: createScheduleDto.startTime,
      endTime: createScheduleDto.endTime,
      roomIds: [createScheduleDto.roomId],
      teacherId: createScheduleDto.teacherId,
    });

    // Convert time strings to Date objects (Prisma expects DateTime for Time fields)
    // Use UTC to avoid timezone conversion issues
    const { hours: startHour, minutes: startMin } = this.parseTime(createScheduleDto.startTime, 'startTime');
    const { hours: endHour, minutes: endMin } = this.parseTime(createScheduleDto.endTime, 'endTime');

    const createData = {
      ...createScheduleDto,
      date: new Date(createScheduleDto.date),
      startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
    };

    return this.prisma.schedule.create({
      data: createData,
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
  }

  async findAll(queryParams?: { date?: string; startDate?: string; endDate?: string; roomId?: string | string[]; teacherId?: string | string[]; groupId?: string | string[] }) {
    const where: any = {};

    // Поддержка диапазона дат для недельного и месячного режима
    if (queryParams?.startDate && queryParams?.endDate) {
      where.date = {
        gte: new Date(queryParams.startDate),
        lte: new Date(queryParams.endDate),
      };
    } else if (queryParams?.date) {
      // Одна дата для дневного режима
      where.date = new Date(queryParams.date);
    } else {
      // Если дата не передана, ограничиваем выборку последними 3 месяцами
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      where.date = {
        gte: threeMonthsAgo,
      };
    }

    if (queryParams?.roomId) {
      where.roomId = Array.isArray(queryParams.roomId)
        ? { in: queryParams.roomId }
        : queryParams.roomId;
    }
    if (queryParams?.teacherId) {
      where.teacherId = Array.isArray(queryParams.teacherId)
        ? { in: queryParams.teacherId }
        : queryParams.teacherId;
    }
    if (queryParams?.groupId) {
      where.groupId = Array.isArray(queryParams.groupId)
        ? { in: queryParams.groupId }
        : queryParams.groupId;
    }

    return this.prisma.schedule.findMany({
      where,
      take: 500, // Лимит для предотвращения перегрузки
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
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
        _count: {
          select: {
            attendances: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
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
        _count: {
          select: {
            attendances: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto) {
    const existing = await this.findOne(id);

    // Verify group exists if being updated
    if (updateScheduleDto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: updateScheduleDto.groupId },
      });
      if (!group) {
        throw new BadRequestException(`Group with ID ${updateScheduleDto.groupId} not found`);
      }
    }

    // Verify teacher exists if being updated
    if (updateScheduleDto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: updateScheduleDto.teacherId },
      });
      if (!teacher) {
        throw new BadRequestException(`Teacher with ID ${updateScheduleDto.teacherId} not found`);
      }
    }

    // Verify room exists if being updated
    if (updateScheduleDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: updateScheduleDto.roomId },
      });
      if (!room) {
        throw new BadRequestException(`Room with ID ${updateScheduleDto.roomId} not found`);
      }
    }

    // Check for conflicts if date/time/room/teacher changed
    if (
      updateScheduleDto.date ||
      updateScheduleDto.startTime ||
      updateScheduleDto.endTime ||
      updateScheduleDto.roomId ||
      updateScheduleDto.teacherId
    ) {
      const existingStart = this.extractTimeString(existing.startTime);
      const existingEnd = this.extractTimeString(existing.endTime);

      await this.conflictChecker.checkConflicts({
        date: updateScheduleDto.date || existing.date.toISOString().split('T')[0],
        startTime: updateScheduleDto.startTime || existingStart,
        endTime: updateScheduleDto.endTime || existingEnd,
        roomIds: [updateScheduleDto.roomId || existing.room.id],
        teacherId: updateScheduleDto.teacherId || existing.teacher.id,
        excludeScheduleId: id,
      });
    }

    // Извлекаем version и поля компенсации для отдельной обработки
    const { version, isCompensated, compensationNote, ...restDto } = updateScheduleDto;

    // Проверяем, меняется ли статус на CANCELLED
    const isBeingCancelled = updateScheduleDto.status === 'CANCELLED' && existing.status !== 'CANCELLED';

    // Проверяем, меняется ли статус С CANCELLED на другой
    const isBeingUncancelled = existing.status === 'CANCELLED' &&
      updateScheduleDto.status &&
      updateScheduleDto.status !== 'CANCELLED';

    // Convert date and time strings to Date objects using UTC
    const updateData: any = { ...restDto };

    // Если отменяется с компенсацией - сохраняем флаг и комментарий
    if (isBeingCancelled && isCompensated) {
      updateData.isCompensated = true;
      updateData.cancellationNote = compensationNote || null;
    }

    // Если занятие "раз-отменяется" - очищаем данные компенсации
    if (isBeingUncancelled) {
      updateData.isCompensated = false;
      updateData.cancellationNote = null;

      // Удалить attendance со статусом EXCUSED (вернуть в "Не отмечен")
      await this.prisma.attendance.deleteMany({
        where: {
          scheduleId: id,
          status: 'EXCUSED',
        },
      });
    }
    if (updateScheduleDto.date) {
      updateData.date = new Date(updateScheduleDto.date);
    }
    if (updateScheduleDto.startTime) {
      const { hours, minutes } = this.parseTime(updateScheduleDto.startTime, 'startTime');
      updateData.startTime = new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
    }
    if (updateScheduleDto.endTime) {
      const { hours, minutes } = this.parseTime(updateScheduleDto.endTime, 'endTime');
      updateData.endTime = new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
    }

    const include = {
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
    };

    // Используем атомарное обновление с проверкой версии только если version передан
    let updatedSchedule;
    if (version !== undefined) {
      updatedSchedule = await updateWithVersionCheck(
        this.prisma,
        'schedule',
        id,
        version,
        updateData,
        include,
      );
    } else {
      updatedSchedule = await this.prisma.schedule.update({
        where: { id },
        data: updateData,
        include,
      });
    }

    // Обработка attendance при отмене
    if (isBeingCancelled) {
      if (isCompensated && existing.groupId) {
        // Отмена с компенсацией - ставим EXCUSED клиентам с активными абонементами
        const noteText = compensationNote || `Компенсация: занятие отменено`;

        // Найти клиентов с активными абонементами
        const clientsWithSubscriptions = await this.findClientsWithActiveSubscriptions(
          existing.groupId,
          existing.date,
        );

        // Получить существующие attendance для этого занятия
        const existingAttendances = await this.prisma.attendance.findMany({
          where: { scheduleId: id },
          select: { clientId: true },
        });
        const existingClientIds = existingAttendances.map(a => a.clientId);

        // Обновить существующие attendance на EXCUSED
        const clientsToUpdate = clientsWithSubscriptions.filter(c =>
          existingClientIds.includes(c.clientId)
        );
        if (clientsToUpdate.length > 0) {
          await this.prisma.attendance.updateMany({
            where: {
              scheduleId: id,
              clientId: { in: clientsToUpdate.map(c => c.clientId) },
            },
            data: {
              status: 'EXCUSED',
              notes: noteText,
            },
          });
        }

        // Создать EXCUSED для клиентов, у которых ещё нет attendance
        const clientsToCreate = clientsWithSubscriptions.filter(c =>
          !existingClientIds.includes(c.clientId)
        );
        if (clientsToCreate.length > 0) {
          await this.prisma.attendance.createMany({
            data: clientsToCreate.map(c => ({
              scheduleId: id,
              clientId: c.clientId,
              status: 'EXCUSED' as const,
              notes: noteText,
              subscriptionId: c.subscriptionId,
              subscriptionDeducted: false,
            })),
          });
        }

        // Клиенты без абонементов - ставим ABSENT
        const subscriptionClientIds = clientsWithSubscriptions.map(c => c.clientId);
        const clientsWithoutSubscription = existingClientIds.filter(
          cid => !subscriptionClientIds.includes(cid)
        );
        if (clientsWithoutSubscription.length > 0) {
          await this.prisma.attendance.updateMany({
            where: {
              scheduleId: id,
              clientId: { in: clientsWithoutSubscription },
            },
            data: { status: 'ABSENT' },
          });
        }
      } else {
        // Обычная отмена - ставим ABSENT
        await this.prisma.attendance.updateMany({
          where: { scheduleId: id },
          data: { status: 'ABSENT' },
        });
      }
    }

    // Отправить уведомление об изменении расписания
    try {
      await this.notificationsService.sendScheduleChangeNotification(id);
    } catch (error) {
      this.logger.error('Failed to send schedule change notification:', error);
      // Не прерываем выполнение если уведомление не отправилось
    }

    return updatedSchedule;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Check if schedule has attendances
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attendances: true,
          },
        },
      },
    });

    if (schedule._count.attendances > 0) {
      throw new Error('Cannot delete schedule that has attendance records');
    }

    return this.prisma.schedule.delete({
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
   * Parse and validate time string in HH:MM format
   */
  private parseTime(time: string, fieldName: string): { hours: number; minutes: number } {
    if (!time || typeof time !== 'string') {
      throw new BadRequestException(`${fieldName}: время не указано`);
    }

    const parts = time.split(':');
    if (parts.length !== 2) {
      throw new BadRequestException(`${fieldName}: некорректный формат времени "${time}". Ожидается HH:MM`);
    }

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) {
      throw new BadRequestException(`${fieldName}: часы и минуты должны быть числами`);
    }

    if (hours < 0 || hours > 23) {
      throw new BadRequestException(`${fieldName}: некорректные часы ${hours}. Допустимый диапазон: 0-23`);
    }

    if (minutes < 0 || minutes > 59) {
      throw new BadRequestException(`${fieldName}: некорректные минуты ${minutes}. Допустимый диапазон: 0-59`);
    }

    return { hours, minutes };
  }

  /**
   * Find clients with active subscriptions for a group on a specific date
   */
  private async findClientsWithActiveSubscriptions(
    groupId: string,
    scheduleDate: Date,
  ): Promise<Array<{ clientId: string; subscriptionId: string }>> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
        startDate: { lte: scheduleDate },
        endDate: { gte: scheduleDate },
        OR: [
          { remainingVisits: null }, // Unlimited subscription
          { remainingVisits: { gt: 0 } }, // Visit pack with remaining visits
        ],
      },
      select: {
        id: true,
        clientId: true,
      },
    });

    return subscriptions.map(s => ({
      clientId: s.clientId,
      subscriptionId: s.id,
    }));
  }
}
