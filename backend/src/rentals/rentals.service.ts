import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { ConflictCheckerService } from '../shared/conflict-checker.service';

@Injectable()
export class RentalsService {
  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
  ) {}

  async create(createRentalDto: CreateRentalDto) {
    // Verify room exists
    const room = await this.prisma.room.findUnique({
      where: { id: createRentalDto.roomId },
    });
    if (!room) {
      throw new BadRequestException(`Room with ID ${createRentalDto.roomId} not found`);
    }

    // Verify manager exists if provided
    if (createRentalDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: createRentalDto.managerId },
      });
      if (!manager) {
        throw new BadRequestException(`Manager with ID ${createRentalDto.managerId} not found`);
      }
    }

    // Check for conflicts with schedules and other rentals
    await this.conflictChecker.checkConflicts({
      date: createRentalDto.date,
      startTime: createRentalDto.startTime,
      endTime: createRentalDto.endTime,
      roomIds: [createRentalDto.roomId],
    });

    // Convert date and time strings to Date objects using UTC
    const [startHour, startMin] = createRentalDto.startTime.split(':').map(Number);
    const [endHour, endMin] = createRentalDto.endTime.split(':').map(Number);

    const createData = {
      ...createRentalDto,
      date: new Date(createRentalDto.date),
      startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
    };

    return this.prisma.rental.create({
      data: createData,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });
  }

  async findAll(queryParams?: { date?: string; roomId?: string; status?: string }) {
    const where: any = {};

    if (queryParams?.date) {
      where.date = new Date(queryParams.date);
    }
    if (queryParams?.roomId) {
      where.roomId = queryParams.roomId;
    }
    if (queryParams?.status) {
      where.status = queryParams.status;
    }

    return this.prisma.rental.findMany({
      where,
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (!rental) {
      throw new NotFoundException(`Rental with ID ${id} not found`);
    }

    return rental;
  }

  async update(id: string, updateRentalDto: UpdateRentalDto) {
    const existing = await this.findOne(id);

    // Verify room exists if being updated
    if (updateRentalDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: updateRentalDto.roomId },
      });
      if (!room) {
        throw new BadRequestException(`Room with ID ${updateRentalDto.roomId} not found`);
      }
    }

    // Verify manager exists if being updated
    if (updateRentalDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: updateRentalDto.managerId },
      });
      if (!manager) {
        throw new BadRequestException(`Manager with ID ${updateRentalDto.managerId} not found`);
      }
    }

    // Check for conflicts if date/time/room changed
    if (
      updateRentalDto.date ||
      updateRentalDto.startTime ||
      updateRentalDto.endTime ||
      updateRentalDto.roomId
    ) {
      const existingStart = this.extractTimeString(existing.startTime);
      const existingEnd = this.extractTimeString(existing.endTime);

      await this.conflictChecker.checkConflicts({
        date: updateRentalDto.date || existing.date.toISOString().split('T')[0],
        startTime: updateRentalDto.startTime || existingStart,
        endTime: updateRentalDto.endTime || existingEnd,
        roomIds: [updateRentalDto.roomId || existing.room.id],
        excludeRentalId: id,
      });
    }

    // Convert date and time strings to Date objects using UTC
    const updateData: any = { ...updateRentalDto };
    if (updateRentalDto.date) {
      updateData.date = new Date(updateRentalDto.date);
    }
    if (updateRentalDto.startTime) {
      const [hour, min] = updateRentalDto.startTime.split(':').map(Number);
      updateData.startTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
    }
    if (updateRentalDto.endTime) {
      const [hour, min] = updateRentalDto.endTime.split(':').map(Number);
      updateData.endTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
    }

    return this.prisma.rental.update({
      where: { id },
      data: updateData,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
        manager: {
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
    await this.findOne(id);

    // Check if rental has payments
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (rental._count.payments > 0) {
      throw new Error('Cannot delete rental that has payment records');
    }

    return this.prisma.rental.delete({
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
