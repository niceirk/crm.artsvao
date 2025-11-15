import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';

@Injectable()
export class EventTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createEventTypeDto: CreateEventTypeDto) {
    return this.prisma.eventType.create({
      data: createEventTypeDto,
    });
  }

  async findAll() {
    return this.prisma.eventType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const eventType = await this.prisma.eventType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!eventType) {
      throw new NotFoundException(`Event type with ID ${id} not found`);
    }

    return eventType;
  }

  async update(id: string, updateEventTypeDto: UpdateEventTypeDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.eventType.update({
      where: { id },
      data: updateEventTypeDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if event type has events
    const eventType = await this.prisma.eventType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (eventType._count.events > 0) {
      throw new BadRequestException('Cannot delete event type that has events');
    }

    return this.prisma.eventType.delete({
      where: { id },
    });
  }
}
