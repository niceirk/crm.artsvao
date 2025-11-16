import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';

@Injectable()
export class StudiosService {
  constructor(private prisma: PrismaService) {}

  async create(createStudioDto: CreateStudioDto) {
    return this.prisma.studio.create({
      data: createStudioDto,
    });
  }

  async findAll() {
    return this.prisma.studio.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            groups: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groups: true,
          },
        },
      },
    });

    if (!studio) {
      throw new NotFoundException(`Studio with ID ${id} not found`);
    }

    return studio;
  }

  async update(id: string, updateStudioDto: UpdateStudioDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.studio.update({
      where: { id },
      data: updateStudioDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if studio has groups
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groups: true,
          },
        },
      },
    });

    if (studio._count.groups > 0) {
      throw new BadRequestException('Cannot delete studio that has groups');
    }

    return this.prisma.studio.delete({
      where: { id },
    });
  }

  async getStudioGroups(studioId: string) {
    await this.findOne(studioId); // Check if exists

    return this.prisma.group.findMany({
      where: { studioId },
      include: {
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
          },
        },
        _count: {
          select: {
            subscriptions: true,
            schedules: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStudioSubscriptionTypes(studioId: string) {
    await this.findOne(studioId); // Check if exists

    return this.prisma.subscriptionType.findMany({
      where: {
        group: {
          studioId,
        },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudioStats(studioId: string) {
    await this.findOne(studioId); // Check if exists

    // Подсчитываем количество групп
    const groupsCount = await this.prisma.group.count({
      where: { studioId },
    });

    // Получаем все группы студии
    const groups = await this.prisma.group.findMany({
      where: { studioId },
      select: { id: true },
    });

    const groupIds = groups.map((g) => g.id);

    // Подсчитываем активные абонементы
    const activeSubscriptionsCount = await this.prisma.subscription.count({
      where: {
        groupId: { in: groupIds },
        status: 'ACTIVE',
      },
    });

    // Подсчитываем уникальных участников
    const participants = await this.prisma.subscription.findMany({
      where: {
        groupId: { in: groupIds },
        status: 'ACTIVE',
      },
      select: {
        clientId: true,
      },
      distinct: ['clientId'],
    });

    return {
      groupsCount,
      activeSubscriptionsCount,
      participantsCount: participants.length,
    };
  }
}
