import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { Workspace, WorkspaceStatus } from '@prisma/client';

/**
 * Информация о занятости рабочего места на конкретную дату
 */
export interface OccupancyInfo {
  applicationId: string;
  applicationNumber: string;
  clientName: string;
  status: string;
}

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto): Promise<Workspace> {
    // Проверяем существование помещения и что оно коворкинг
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });

    if (!room) {
      throw new NotFoundException('Помещение не найдено');
    }

    if (!room.isCoworking) {
      throw new BadRequestException(
        'Рабочие места можно создавать только в помещениях с типом коворкинг',
      );
    }

    return this.prisma.workspace.create({
      data: {
        roomId: dto.roomId,
        name: dto.name,
        number: dto.number,
        dailyRate: dto.dailyRate,
        monthlyRate: dto.monthlyRate,
        status: dto.status || WorkspaceStatus.AVAILABLE,
        description: dto.description,
        amenities: dto.amenities,
      },
      include: {
        room: true,
      },
    });
  }

  async findAll(roomId?: string): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: roomId ? { roomId } : undefined,
      include: {
        room: true,
        _count: {
          select: {
            rentalApplications: true,
          },
        },
      },
      orderBy: [{ room: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Workspace> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        room: true,
        rentalApplications: {
          include: {
            rentalApplication: {
              include: {
                client: true,
              },
            },
          },
          take: 10,
          orderBy: {
            rentalApplication: {
              createdAt: 'desc',
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее место не найдено');
    }

    return workspace;
  }

  async update(id: string, dto: UpdateWorkspaceDto): Promise<Workspace> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее место не найдено');
    }

    // Если меняется roomId, проверяем что новое помещение - коворкинг
    if (dto.roomId && dto.roomId !== workspace.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomId },
      });

      if (!room) {
        throw new NotFoundException('Помещение не найдено');
      }

      if (!room.isCoworking) {
        throw new BadRequestException(
          'Рабочие места можно создавать только в помещениях с типом коворкинг',
        );
      }
    }

    return this.prisma.workspace.update({
      where: { id },
      data: {
        roomId: dto.roomId,
        name: dto.name,
        number: dto.number,
        dailyRate: dto.dailyRate,
        monthlyRate: dto.monthlyRate,
        status: dto.status,
        description: dto.description,
        amenities: dto.amenities,
      },
      include: {
        room: true,
      },
    });
  }

  async remove(id: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rentalApplications: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее место не найдено');
    }

    // Проверяем, есть ли активные заявки на аренду
    const activeApplications = await this.prisma.rentalApplicationWorkspace.count({
      where: {
        workspaceId: id,
        rentalApplication: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'ACTIVE'],
          },
        },
      },
    });

    if (activeApplications > 0) {
      throw new BadRequestException(
        'Невозможно удалить рабочее место с активными заявками на аренду',
      );
    }

    await this.prisma.workspace.delete({
      where: { id },
    });
  }

  async getAvailability(
    workspaceId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ available: boolean; occupiedDates: string[] }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Рабочее место не найдено');
    }

    // Получаем все заявки на это рабочее место в указанном периоде
    // Включаем DRAFT и PENDING - чтобы занятость отображалась сразу после создания заявки
    const applications = await this.prisma.rentalApplicationWorkspace.findMany({
      where: {
        workspaceId,
        rentalApplication: {
          status: {
            in: ['DRAFT', 'PENDING', 'CONFIRMED', 'ACTIVE'],
          },
          OR: [
            {
              // Период аренды пересекается с запрашиваемым периодом
              startDate: { lte: new Date(endDate) },
              endDate: { gte: new Date(startDate) },
            },
            {
              // Или endDate null (бессрочно) и startDate до конца периода
              startDate: { lte: new Date(endDate) },
              endDate: null,
            },
          ],
        },
      },
      include: {
        rentalApplication: {
          include: {
            selectedDays: true,
          },
        },
      },
    });

    // Собираем занятые даты
    const occupiedDates = new Set<string>();

    for (const appWorkspace of applications) {
      const app = appWorkspace.rentalApplication;

      if (app.periodType === 'SPECIFIC_DAYS') {
        // Для конкретных дней - берём из selectedDays
        for (const day of app.selectedDays) {
          const dateStr = day.date.toISOString().split('T')[0];
          if (dateStr >= startDate && dateStr <= endDate) {
            occupiedDates.add(dateStr);
          }
        }
      } else {
        // Для месячной аренды - все дни в периоде
        const appStart = app.startDate;
        const appEnd = app.endDate || new Date('2099-12-31');

        const rangeStart = new Date(
          Math.max(appStart.getTime(), new Date(startDate).getTime()),
        );
        const rangeEnd = new Date(
          Math.min(appEnd.getTime(), new Date(endDate).getTime()),
        );

        const current = new Date(rangeStart);
        while (current <= rangeEnd) {
          occupiedDates.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    }

    return {
      available: occupiedDates.size === 0,
      occupiedDates: Array.from(occupiedDates).sort(),
    };
  }

  /**
   * Получение доступности для нескольких рабочих мест одним запросом
   * Оптимизировано для уменьшения количества запросов к БД
   * Возвращает для каждого workspace массив занятых дат с информацией о заявке
   */
  async getBatchAvailability(
    workspaceIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<Record<string, Record<string, OccupancyInfo>>> {
    if (workspaceIds.length === 0) {
      return {};
    }

    // Один запрос для всех workspaces
    // Включаем DRAFT и PENDING - чтобы занятость отображалась сразу после создания заявки
    const applications = await this.prisma.rentalApplicationWorkspace.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        rentalApplication: {
          status: { in: ['DRAFT', 'PENDING', 'CONFIRMED', 'ACTIVE'] },
          OR: [
            {
              startDate: { lte: new Date(endDate) },
              endDate: { gte: new Date(startDate) },
            },
            {
              startDate: { lte: new Date(endDate) },
              endDate: null,
            },
          ],
        },
      },
      include: {
        rentalApplication: {
          include: {
            selectedDays: true,
            client: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Инициализация результата для всех запрошенных workspaces
    // Формат: { workspaceId: { date: OccupancyInfo } }
    const result: Record<string, Record<string, OccupancyInfo>> = {};
    for (const wsId of workspaceIds) {
      result[wsId] = {};
    }

    // Группировка занятых дат по workspaceId
    for (const appWorkspace of applications) {
      const app = appWorkspace.rentalApplication;
      const wsId = appWorkspace.workspaceId;

      const occupancyInfo: OccupancyInfo = {
        applicationId: app.id,
        applicationNumber: app.applicationNumber,
        clientName: `${app.client.lastName} ${app.client.firstName}`,
        status: app.status,
      };

      if (app.periodType === 'SPECIFIC_DAYS') {
        // Для конкретных дней - берём из selectedDays
        for (const day of app.selectedDays) {
          const dateStr = day.date.toISOString().split('T')[0];
          if (dateStr >= startDate && dateStr <= endDate) {
            result[wsId][dateStr] = occupancyInfo;
          }
        }
      } else {
        // Для месячной аренды - все дни в периоде
        const appStart = app.startDate;
        const appEnd = app.endDate || new Date('2099-12-31');

        const rangeStart = new Date(
          Math.max(appStart.getTime(), new Date(startDate).getTime()),
        );
        const rangeEnd = new Date(
          Math.min(appEnd.getTime(), new Date(endDate).getTime()),
        );

        const current = new Date(rangeStart);
        while (current <= rangeEnd) {
          const dateStr = current.toISOString().split('T')[0];
          result[wsId][dateStr] = occupancyInfo;
          current.setDate(current.getDate() + 1);
        }
      }
    }

    return result;
  }

  async findByRoom(roomId: string): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: { roomId },
      orderBy: { name: 'asc' },
    });
  }

  async findByRoomIds(roomIds: string[]): Promise<Workspace[]> {
    if (roomIds.length === 0) {
      return [];
    }

    return this.prisma.workspace.findMany({
      where: { roomId: { in: roomIds } },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
            isCoworking: true,
          },
        },
      },
      orderBy: [{ roomId: 'asc' }, { name: 'asc' }],
    });
  }
}
