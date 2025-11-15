import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(createGroupDto: CreateGroupDto) {
    // Verify studio exists
    const studio = await this.prisma.studio.findUnique({
      where: { id: createGroupDto.studioId },
    });
    if (!studio) {
      throw new BadRequestException(`Studio with ID ${createGroupDto.studioId} not found`);
    }

    // Verify teacher exists
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: createGroupDto.teacherId },
    });
    if (!teacher) {
      throw new BadRequestException(`Teacher with ID ${createGroupDto.teacherId} not found`);
    }

    // Verify room exists if provided
    if (createGroupDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: createGroupDto.roomId },
      });
      if (!room) {
        throw new BadRequestException(`Room with ID ${createGroupDto.roomId} not found`);
      }
    }

    return this.prisma.group.create({
      data: createGroupDto,
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            type: true,
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

  async findAll() {
    return this.prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            type: true,
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
            schedules: true,
            subscriptions: true,
            subscriptionTypes: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            type: true,
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
            schedules: true,
            subscriptions: true,
            subscriptionTypes: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto) {
    await this.findOne(id); // Check if exists

    // Verify studio exists if being updated
    if (updateGroupDto.studioId) {
      const studio = await this.prisma.studio.findUnique({
        where: { id: updateGroupDto.studioId },
      });
      if (!studio) {
        throw new BadRequestException(`Studio with ID ${updateGroupDto.studioId} not found`);
      }
    }

    // Verify teacher exists if being updated
    if (updateGroupDto.teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: updateGroupDto.teacherId },
      });
      if (!teacher) {
        throw new BadRequestException(`Teacher with ID ${updateGroupDto.teacherId} not found`);
      }
    }

    // Verify room exists if being updated
    if (updateGroupDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: updateGroupDto.roomId },
      });
      if (!room) {
        throw new BadRequestException(`Room with ID ${updateGroupDto.roomId} not found`);
      }
    }

    return this.prisma.group.update({
      where: { id },
      data: updateGroupDto,
      include: {
        studio: {
          select: {
            id: true,
            name: true,
            type: true,
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

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if group has schedules or subscriptions
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            schedules: true,
            subscriptions: true,
          },
        },
      },
    });

    if (group._count.schedules > 0 || group._count.subscriptions > 0) {
      throw new Error(
        'Cannot delete group that has schedules or subscriptions',
      );
    }

    return this.prisma.group.delete({
      where: { id },
    });
  }
}
