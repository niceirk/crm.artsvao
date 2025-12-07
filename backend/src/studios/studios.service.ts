import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { S3StorageService } from '../common/services/s3-storage.service';

@Injectable()
export class StudiosService {
  private readonly logger = new Logger(StudiosService.name);

  constructor(
    private prisma: PrismaService,
    private s3Storage: S3StorageService,
  ) {}

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
            members: {
              where: { status: 'ACTIVE' },
            },
            schedules: true,
          },
        },
      },
      orderBy: [
        { ageMin: { sort: 'asc', nulls: 'last' } },
        { name: 'asc' },
      ],
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
        _count: {
          select: {
            subscriptions: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: [
        { group: { name: 'asc' } },
        { name: 'asc' },
      ],
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

    // Подсчитываем уникальных участников (из GroupMember)
    const participants = await this.prisma.groupMember.findMany({
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

  /**
   * Загрузить фото студии в S3
   */
  async uploadPhoto(studioId: string, file: Express.Multer.File) {
    const studio = await this.findOne(studioId);

    // Удаляем старое фото из S3, если оно есть
    if (studio.photoUrl && !studio.photoUrl.startsWith('/uploads/')) {
      try {
        const urlParts = studio.photoUrl.split('/');
        const fileName = `studios/${urlParts[urlParts.length - 1]}`;
        await this.s3Storage.deleteImage(fileName);
      } catch (error) {
        this.logger.warn(`Failed to delete old photo: ${error.message}`);
      }
    }

    // Загружаем новое фото в S3
    const result = await this.s3Storage.uploadImage(file, 'studios', 1200, 85);

    return this.prisma.studio.update({
      where: { id: studioId },
      data: { photoUrl: result.imageUrl },
    });
  }

  /**
   * Удалить фото студии из S3
   */
  async deletePhoto(studioId: string) {
    const studio = await this.findOne(studioId);

    // Удаляем фото из S3, если оно есть
    if (studio.photoUrl && !studio.photoUrl.startsWith('/uploads/')) {
      try {
        const urlParts = studio.photoUrl.split('/');
        const fileName = `studios/${urlParts[urlParts.length - 1]}`;
        await this.s3Storage.deleteImage(fileName);
      } catch (error) {
        this.logger.warn(`Failed to delete photo from S3: ${error.message}`);
      }
    }

    return this.prisma.studio.update({
      where: { id: studioId },
      data: { photoUrl: null },
    });
  }
}
