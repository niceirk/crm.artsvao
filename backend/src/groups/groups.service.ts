import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupFilterDto } from './dto/group-filter.dto';
import { updateWithVersionCheck } from '../common/utils/optimistic-lock.util';

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

    const { weeklySchedule, ...restDto } = createGroupDto;

    return this.prisma.group.create({
      data: {
        ...restDto,
        weeklySchedule: weeklySchedule as any,
      },
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

  async findAll(filterDto: GroupFilterDto = {}) {
    const {
      search,
      studioId,
      teacherId,
      roomId,
      status,
      isPaid,
      ageRange,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = filterDto;

    // Построение where условий
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (studioId) {
      where.studioId = studioId;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (roomId) {
      where.roomId = roomId;
    }

    if (status) {
      where.status = status;
    }

    if (isPaid !== undefined) {
      where.isPaid = isPaid;
    }

    // Фильтр по возрастным категориям
    if (ageRange && ageRange !== 'all') {
      switch (ageRange) {
        case 'child':
          where.AND = [
            { OR: [{ ageMin: { lte: 12 } }, { ageMin: null }] },
            { OR: [{ ageMax: { gte: 0 } }, { ageMax: null }] },
          ];
          break;
        case 'teen':
          where.AND = [
            { OR: [{ ageMin: { lte: 17 } }, { ageMin: null }] },
            { OR: [{ ageMax: { gte: 13 } }, { ageMax: null }] },
          ];
          break;
        case 'adult':
          where.OR = [{ ageMin: { gte: 18 } }, { ageMin: null }];
          break;
      }
    }

    // Пагинация
    const skip = (page - 1) * limit;

    // Сортировка
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Выполнение запроса
    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
      }),
      this.prisma.group.count({ where }),
    ]);

    const memberCountsMap = await this.getMemberCountsMap(data.map((group) => group.id));

    return {
      data: data.map((group) => ({
        ...group,
        memberCounts: memberCountsMap.get(group.id) ?? {
          active: 0,
          waitlist: 0,
          expelled: 0,
          total: 0,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    const memberCountsMap = await this.getMemberCountsMap([id]);

    return {
      ...group,
      memberCounts: memberCountsMap.get(id) ?? {
        active: 0,
        waitlist: 0,
        expelled: 0,
        total: 0,
      },
    };
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

    const { version, weeklySchedule, ...restDto } = updateGroupDto;

    const data = {
      ...restDto,
      ...(weeklySchedule !== undefined && { weeklySchedule: weeklySchedule as any }),
    };

    const include = {
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
    };

    // Используем атомарное обновление с проверкой версии только если version передан
    if (version !== undefined) {
      return updateWithVersionCheck(this.prisma, 'group', id, version, data, include);
    } else {
      return this.prisma.group.update({ where: { id }, data, include });
    }
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

  async getGroupMembers(groupId: string, status?: 'ACTIVE' | 'WAITLIST' | 'EXPELLED') {
    await this.findOne(groupId); // Check if group exists

    const where: any = { groupId };
    if (status) {
      where.status = status;
    } else {
      // По умолчанию возвращаем только активных участников
      where.status = 'ACTIVE';
    }

    return this.prisma.groupMember.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            email: true,
            photoUrl: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: [
        {
          waitlistPosition: 'asc', // Сначала по позиции в очереди (для WAITLIST)
        },
        {
          client: {
            lastName: 'asc',
          },
        },
      ],
    });
  }

  async updateWeeklySchedule(groupId: string, weeklySchedule: any[]) {
    await this.findOne(groupId); // Check if group exists

    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        weeklySchedule: weeklySchedule as any
      },
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

  async getGroupMonthlySchedule(groupId: string, year: number, month: number) {
    // Verify group exists
    await this.findOne(groupId);

    // Calculate start and end dates of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get all schedules for this group in the given month
    // Exclude parent recurring records (isRecurring: true)
    return this.prisma.schedule.findMany({
      where: {
        groupId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        isRecurring: false, // Только реальные занятия, без родительских записей
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
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
      orderBy: {
        date: 'asc',
      },
    });
  }

  async getScheduledMonths(groupId: string) {
    // Verify group exists
    await this.findOne(groupId);

    // Get all schedules for this group
    const schedules = await this.prisma.schedule.findMany({
      where: {
        groupId,
        isRecurring: false,
      },
      select: {
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Group schedules by month
    const monthsMap = new Map<string, { count: number; firstDate: Date; lastDate: Date }>();

    schedules.forEach(schedule => {
      const date = new Date(schedule.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthsMap.has(yearMonth)) {
        monthsMap.set(yearMonth, {
          count: 1,
          firstDate: date,
          lastDate: date,
        });
      } else {
        const monthData = monthsMap.get(yearMonth);
        monthData.count++;
        if (date < monthData.firstDate) monthData.firstDate = date;
        if (date > monthData.lastDate) monthData.lastDate = date;
      }
    });

    // Convert map to array and format the response
    return Array.from(monthsMap.entries()).map(([yearMonth, data]) => ({
      yearMonth,
      count: data.count,
      firstDate: data.firstDate.toISOString(),
      lastDate: data.lastDate.toISOString(),
    }));
  }

  // ===== Методы для управления участниками группы =====

  async checkAvailability(groupId: string) {
    const group = await this.findOne(groupId);

    const activeCount = await this.prisma.groupMember.count({
      where: {
        groupId,
        status: 'ACTIVE',
      },
    });

    return {
      total: group.maxParticipants,
      occupied: activeCount,
      available: group.maxParticipants - activeCount,
      isFull: activeCount >= group.maxParticipants,
    };
  }

  async addMember(groupId: string, clientId: string) {
    // Проверить что группа существует
    const group = await this.findOne(groupId);

    // Проверить что клиент существует
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Проверить, не является ли клиент уже участником
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_clientId: {
          groupId,
          clientId,
        },
      },
    });

    if (existingMember) {
      if (existingMember.status === 'EXPELLED') {
        // Если был отчислен, можно восстановить
        throw new BadRequestException(
          'Client was previously expelled from this group. Please restore membership first.',
        );
      }
      throw new BadRequestException('Client is already a member of this group');
    }

    // Проверить доступность мест
    const availability = await this.checkAvailability(groupId);

    if (availability.isFull) {
      // Добавить в лист ожидания
      const lastWaitlistPosition = await this.prisma.groupMember.findFirst({
        where: {
          groupId,
          status: 'WAITLIST',
        },
        orderBy: {
          waitlistPosition: 'desc',
        },
      });

      const waitlistPosition = (lastWaitlistPosition?.waitlistPosition || 0) + 1;

      return {
        member: await this.prisma.groupMember.create({
          data: {
            groupId,
            clientId,
            status: 'WAITLIST',
            waitlistPosition,
          },
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                phone: true,
                email: true,
                photoUrl: true,
              },
            },
          },
        }),
        waitlisted: true,
        position: waitlistPosition,
      };
    }

    // Добавить как активного участника
    return {
      member: await this.prisma.groupMember.create({
        data: {
          groupId,
          clientId,
          status: 'ACTIVE',
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              phone: true,
              email: true,
              photoUrl: true,
            },
          },
        },
      }),
      waitlisted: false,
    };
  }

  async removeMember(memberId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Group member not found');
    }

    // Отчисляем участника
    const updatedMember = await this.prisma.groupMember.update({
      where: { id: memberId },
      data: {
        status: 'EXPELLED',
        leftAt: new Date(),
      },
    });

    // Если был активный участник, автоматически переводим первого из листа ожидания
    if (member.status === 'ACTIVE') {
      await this.promoteFromWaitlist(member.groupId);
    }

    return updatedMember;
  }

  async getWaitlist(groupId: string) {
    await this.findOne(groupId); // Check if group exists

    return this.prisma.groupMember.findMany({
      where: {
        groupId,
        status: 'WAITLIST',
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            email: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        waitlistPosition: 'asc',
      },
    });
  }

  async promoteFromWaitlist(groupId: string) {
    // Проверить доступность мест
    const availability = await this.checkAvailability(groupId);

    if (availability.isFull) {
      return null; // Нет свободных мест
    }

    // Найти первого в листе ожидания
    const firstInWaitlist = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        status: 'WAITLIST',
      },
      orderBy: {
        waitlistPosition: 'asc',
      },
    });

    if (!firstInWaitlist) {
      return null; // Лист ожидания пуст
    }

    // Перевести в активные участники
    const promoted = await this.prisma.groupMember.update({
      where: { id: firstInWaitlist.id },
      data: {
        status: 'ACTIVE',
        waitlistPosition: null,
        promotedFromWaitlistAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    });

    // Обновить позиции оставшихся в листе ожидания
    const remainingWaitlist = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        status: 'WAITLIST',
      },
      orderBy: {
        waitlistPosition: 'asc',
      },
    });

    for (let i = 0; i < remainingWaitlist.length; i++) {
      await this.prisma.groupMember.update({
        where: { id: remainingWaitlist[i].id },
        data: {
          waitlistPosition: i + 1,
        },
      });
    }

    return promoted;
  }

  async updateMemberStatus(
    memberId: string,
    status: 'ACTIVE' | 'WAITLIST' | 'EXPELLED',
  ) {
    const member = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Group member not found');
    }

    const updateData: any = { status };

    if (status === 'EXPELLED') {
      updateData.leftAt = new Date();
    } else if (status === 'ACTIVE' && member.status === 'WAITLIST') {
      // Проверить доступность мест
      const availability = await this.checkAvailability(member.groupId);
      if (availability.isFull) {
        throw new BadRequestException('Group is full. Cannot promote to active member.');
      }
      updateData.waitlistPosition = null;
      updateData.promotedFromWaitlistAt = new Date();
    } else if (status === 'ACTIVE' && member.status === 'EXPELLED') {
      // Восстановление из отчисленных - проверить доступность мест
      const availability = await this.checkAvailability(member.groupId);
      if (availability.isFull) {
        throw new BadRequestException('Group is full. Cannot restore expelled member.');
      }
      updateData.leftAt = null;
      updateData.joinedAt = new Date(); // Обновляем дату зачисления
    }

    const updated = await this.prisma.groupMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    });

    // Если переведен из ACTIVE в другой статус, попробовать перевести кого-то из листа ожидания
    if (member.status === 'ACTIVE' && status !== 'ACTIVE') {
      await this.promoteFromWaitlist(member.groupId);
    }

    return updated;
  }

  private async getMemberCountsMap(groupIds: string[]) {
    if (!groupIds.length) {
      return new Map<string, { active: number; waitlist: number; expelled: number; total: number }>();
    }

    const rawCounts = await this.prisma.groupMember.groupBy({
      by: ['groupId', 'status'],
      where: {
        groupId: {
          in: groupIds,
        },
      },
      _count: {
        _all: true,
      },
    });

    const emptyCounts = { active: 0, waitlist: 0, expelled: 0, total: 0 };
    const result = new Map<string, { active: number; waitlist: number; expelled: number; total: number }>();

    groupIds.forEach((id) => result.set(id, { ...emptyCounts }));

    rawCounts.forEach(({ groupId, status, _count }) => {
      const entry = result.get(groupId);
      if (!entry) {
        return;
      }
      entry.total += _count._all;
      if (status === 'ACTIVE') {
        entry.active += _count._all;
      } else if (status === 'WAITLIST') {
        entry.waitlist += _count._all;
      } else if (status === 'EXPELLED') {
        entry.expelled += _count._all;
      }
    });

    return result;
  }
}
