import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    return this.prisma.room.create({
      data: createRoomDto,
    });
  }

  async findAll() {
    return this.prisma.room.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            schedules: true,
            rentals: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            schedules: true,
            rentals: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.room.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if room is used in schedules or rentals
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            schedules: true,
            rentals: true,
          },
        },
      },
    });

    if (room._count.schedules > 0 || room._count.rentals > 0) {
      throw new BadRequestException(
        'Cannot delete room that is used in schedules or rentals',
      );
    }

    return this.prisma.room.delete({
      where: { id },
    });
  }
}
