import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ConflictCheckerService } from '../shared/conflict-checker.service';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
  ) {}

  async create(createReservationDto: CreateReservationDto) {
    // Verify room exists
    const room = await this.prisma.room.findUnique({
      where: { id: createReservationDto.roomId },
    });

    if (!room) {
      throw new BadRequestException(
        `Room with ID ${createReservationDto.roomId} not found`,
      );
    }

    // Check for conflicts
    await this.conflictChecker.checkConflicts({
      date: createReservationDto.date,
      startTime: createReservationDto.startTime,
      endTime: createReservationDto.endTime,
      roomIds: [createReservationDto.roomId],
    });

    // Convert time strings (HH:mm) to UTC Date objects
    const [startHour, startMin] = createReservationDto.startTime
      .split(':')
      .map(Number);
    const [endHour, endMin] = createReservationDto.endTime.split(':').map(Number);

    const startTime = new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0));
    const endTime = new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0));

    const createData = {
      ...createReservationDto,
      date: new Date(createReservationDto.date),
      startTime,
      endTime,
    };

    return this.prisma.reservation.create({
      data: createData,
      include: {
        room: true,
      },
    });
  }

  async findAll(filters?: { date?: string; roomId?: string; status?: string }) {
    const where: any = {};

    if (filters?.date) {
      where.date = new Date(filters.date);
    }

    if (filters?.roomId) {
      where.roomId = filters.roomId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.reservation.findMany({
      where,
      include: {
        room: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        room: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async update(id: string, updateReservationDto: UpdateReservationDto) {
    const existing = await this.findOne(id);

    // Verify room if roomId is being updated
    if (updateReservationDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: updateReservationDto.roomId },
      });

      if (!room) {
        throw new BadRequestException(
          `Room with ID ${updateReservationDto.roomId} not found`,
        );
      }
    }

    // Check for conflicts if date/time/room changed
    if (
      updateReservationDto.date ||
      updateReservationDto.startTime ||
      updateReservationDto.endTime ||
      updateReservationDto.roomId
    ) {
      const existingStart = this.extractTimeString(existing.startTime);
      const existingEnd = this.extractTimeString(existing.endTime);

      await this.conflictChecker.checkConflicts({
        date: updateReservationDto.date || existing.date.toISOString().split('T')[0],
        startTime: updateReservationDto.startTime || existingStart,
        endTime: updateReservationDto.endTime || existingEnd,
        roomIds: [updateReservationDto.roomId || existing.room.id],
        excludeReservationId: id,
      });
    }

    const updateData: any = { ...updateReservationDto };

    // Convert date if provided
    if (updateReservationDto.date) {
      updateData.date = new Date(updateReservationDto.date);
    }

    // Convert time strings if provided
    if (updateReservationDto.startTime) {
      const [startHour, startMin] = updateReservationDto.startTime
        .split(':')
        .map(Number);
      updateData.startTime = new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0));
    }

    if (updateReservationDto.endTime) {
      const [endHour, endMin] = updateReservationDto.endTime.split(':').map(Number);
      updateData.endTime = new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0));
    }

    return this.prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        room: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.reservation.delete({
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
