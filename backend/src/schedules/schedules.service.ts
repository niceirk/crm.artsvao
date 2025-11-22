import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createScheduleDto: CreateScheduleDto) {
    // Verify group exists if provided
    if (createScheduleDto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: createScheduleDto.groupId },
      });
      if (!group) {
        throw new BadRequestException(`Group with ID ${createScheduleDto.groupId} not found`);
      }
    }

    // Verify teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: createScheduleDto.teacherId },
    });
    if (!teacher) {
      throw new BadRequestException(`Teacher with ID ${createScheduleDto.teacherId} not found`);
    }

    // Verify room exists
    const room = await this.prisma.room.findUnique({
      where: { id: createScheduleDto.roomId },
    });
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
    const [startHour, startMin] = createScheduleDto.startTime.split(':').map(Number);
    const [endHour, endMin] = createScheduleDto.endTime.split(':').map(Number);

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

  async findAll(queryParams?: { date?: string; roomId?: string | string[]; teacherId?: string | string[]; groupId?: string | string[] }) {
    const where: any = {};

    if (queryParams?.date) {
      where.date = new Date(queryParams.date);
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

    // Convert date and time strings to Date objects using UTC
    const updateData: any = { ...updateScheduleDto };
    if (updateScheduleDto.date) {
      updateData.date = new Date(updateScheduleDto.date);
    }
    if (updateScheduleDto.startTime) {
      const [hour, min] = updateScheduleDto.startTime.split(':').map(Number);
      updateData.startTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
    }
    if (updateScheduleDto.endTime) {
      const [hour, min] = updateScheduleDto.endTime.split(':').map(Number);
      updateData.endTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
    }

    const updatedSchedule = await this.prisma.schedule.update({
      where: { id },
      data: updateData,
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

    // Отправить уведомление об изменении расписания
    try {
      await this.notificationsService.sendScheduleChangeNotification(id);
    } catch (error) {
      console.error('Failed to send schedule change notification:', error);
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
}
