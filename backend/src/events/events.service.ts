import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ConflictCheckerService } from '../shared/conflict-checker.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
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

    return this.prisma.event.create({
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
  }

  async findAll(filters?: { date?: string; status?: string; eventTypeId?: string }) {
    const where: any = {};

    if (filters?.date) {
      where.date = new Date(filters.date);
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.eventTypeId) {
      where.eventTypeId = filters.eventTypeId;
    }

    // Автоматически обновляем статусы завершенных событий
    await this.updateCompletedEvents();

    return this.prisma.event.findMany({
      where,
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

    return this.prisma.event.update({
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
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

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
}
