import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientActivityService } from '../clients/client-activity.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import {
  AttendanceStatus,
  SubscriptionStatus,
  WriteOffStatus,
  WriteOffTiming,
  Subscription,
} from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private clientActivityService: ClientActivityService,
  ) {}

  async markAttendance(dto: CreateAttendanceDto, userId: string) {
    // 1. Получить Schedule с Group
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: dto.scheduleId },
      include: { group: true },
    });

    if (!schedule || !schedule.group) {
      throw new NotFoundException('Расписание или группа не найдены');
    }

    // 2. Проверить дубликаты
    const existing = await this.prisma.attendance.findFirst({
      where: {
        scheduleId: dto.scheduleId,
        clientId: dto.clientId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Посещаемость для этого клиента уже отмечена',
      );
    }

    let subscriptionId = null;
    let subscriptionDeducted = false;

    // 3. Если статус PRESENT - найти и списать абонемент
    if (dto.status === AttendanceStatus.PRESENT) {
      if (!schedule.groupId && dto.subscriptionId) {
        throw new BadRequestException(
          'Невозможно указать основание без привязки к группе',
        );
      }

      const subscription = schedule.groupId
        ? await this.findValidSubscription(
            dto.clientId,
            schedule.groupId,
            schedule.date,
            dto.subscriptionId,
          )
        : null;

      if (subscription) {
        if (subscription.subscriptionType.type === 'SINGLE_VISIT') {
          if (subscription.remainingVisits <= 0) {
            throw new BadRequestException(
              'На абонементе не осталось посещений',
            );
          }

          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              remainingVisits: subscription.remainingVisits - 1,
            },
          });
        }

        await this.updateInvoiceItemStatus(subscription.id, schedule.date);

        subscriptionId = subscription.id;
        subscriptionDeducted = true;
      }
    }

    // 4. Создать запись посещения
    const attendance = await this.prisma.attendance.create({
      data: {
        scheduleId: dto.scheduleId,
        clientId: dto.clientId,
        subscriptionId,
        status: dto.status,
        notes: dto.notes,
        subscriptionDeducted,
        markedBy: userId,
        markedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
          },
        },
        schedule: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subscription: {
          include: {
            subscriptionType: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        markedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Обновить активность клиента и автоматически реактивировать если нужно
    await this.clientActivityService.reactivateClientIfNeeded(dto.clientId);

    return attendance;
  }

  async findValidSubscription(
    clientId: string,
    groupId: string,
    scheduleDate: Date,
    preferredSubscriptionId?: string,
  ): Promise<
    | (Subscription & {
        subscriptionType: { type: string };
      })
    | null
  > {
    if (preferredSubscriptionId) {
      return this.validateSubscriptionForSchedule(
        preferredSubscriptionId,
        clientId,
        groupId,
        scheduleDate,
      );
    }

    if (!groupId) {
      return null;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        clientId,
        groupId,
        status: SubscriptionStatus.ACTIVE,
        startDate: { lte: scheduleDate },
        endDate: { gte: scheduleDate },
        OR: [
          { remainingVisits: null }, // UNLIMITED
          { remainingVisits: { gt: 0 } }, // SINGLE_VISIT с остатком
        ],
      },
      include: {
        subscriptionType: true,
      },
      orderBy: { createdAt: 'desc' }, // Приоритет новым
    });

    return subscription;
  }

  private async validateSubscriptionForSchedule(
    subscriptionId: string,
    clientId: string,
    groupId: string,
    scheduleDate: Date,
  ): Promise<Subscription & { subscriptionType: { type: string } }> {
    if (!groupId) {
      throw new BadRequestException(
        'Невозможно использовать абонемент для занятия без группы',
      );
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        subscriptionType: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    if (subscription.clientId !== clientId) {
      throw new BadRequestException(
        'Абонемент привязан к другому клиенту',
      );
    }

    if (subscription.groupId !== groupId) {
      throw new BadRequestException(
        'Абонемент не привязан к этой группе',
      );
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Абонемент не активен');
    }

    if (
      subscription.startDate > scheduleDate ||
      subscription.endDate < scheduleDate
    ) {
      throw new BadRequestException(
        'Абонемент недействителен на дату занятия',
      );
    }

    if (
      subscription.subscriptionType.type === 'SINGLE_VISIT' &&
      (subscription.remainingVisits ?? 0) <= 0
    ) {
      throw new BadRequestException(
        'На абонементе не осталось посещений',
      );
    }

    return subscription;
  }

  async updateInvoiceItemStatus(subscriptionId: string, attendanceDate: Date) {
    // Найти InvoiceItem связанный с абонементом
    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          subscriptionId: subscriptionId,
        },
        writeOffTiming: WriteOffTiming.ON_USE,
      },
    });

    for (const item of invoiceItems) {
      // PENDING → IN_PROGRESS при первом списании
      if (item.writeOffStatus === WriteOffStatus.PENDING) {
        await this.prisma.invoiceItem.update({
          where: { id: item.id },
          data: { writeOffStatus: WriteOffStatus.IN_PROGRESS },
        });
      }

      // Проверить, все ли посещения списаны (для SINGLE_VISIT)
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { subscriptionType: true },
      });

      if (
        subscription?.subscriptionType.type === 'SINGLE_VISIT' &&
        subscription.remainingVisits === 0
      ) {
        await this.prisma.invoiceItem.update({
          where: { id: item.id },
          data: { writeOffStatus: WriteOffStatus.COMPLETED },
        });
      }
    }
  }

  async revertInvoiceItemStatus(subscriptionId: string) {
    // Найти InvoiceItem связанный с абонементом
    const invoiceItems = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          subscriptionId: subscriptionId,
        },
        writeOffTiming: WriteOffTiming.ON_USE,
      },
    });

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { subscriptionType: true },
    });

    for (const item of invoiceItems) {
      // COMPLETED → IN_PROGRESS если есть остаток
      if (
        item.writeOffStatus === WriteOffStatus.COMPLETED &&
        subscription?.subscriptionType.type === 'SINGLE_VISIT' &&
        subscription.remainingVisits > 0
      ) {
        await this.prisma.invoiceItem.update({
          where: { id: item.id },
          data: { writeOffStatus: WriteOffStatus.IN_PROGRESS },
        });
      }

      // IN_PROGRESS → PENDING если нет списаний
      const attendanceCount = await this.prisma.attendance.count({
        where: {
          subscriptionId: subscriptionId,
          status: AttendanceStatus.PRESENT,
          subscriptionDeducted: true,
        },
      });

      if (attendanceCount === 0 && item.writeOffStatus === WriteOffStatus.IN_PROGRESS) {
        await this.prisma.invoiceItem.update({
          where: { id: item.id },
          data: { writeOffStatus: WriteOffStatus.PENDING },
        });
      }
    }
  }

  async updateStatus(id: string, dto: UpdateAttendanceDto, userId: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: { subscription: { include: { subscriptionType: true } } },
    });

    if (!attendance) {
      throw new NotFoundException('Запись посещения не найдена');
    }

    const oldStatus = attendance.status;
    const newStatus = dto.status || oldStatus;

    // Если меняем С PRESENT на другой статус - вернуть посещение
    if (
      oldStatus === AttendanceStatus.PRESENT &&
      newStatus !== AttendanceStatus.PRESENT &&
      attendance.subscriptionDeducted &&
      attendance.subscriptionId
    ) {
      if (attendance.subscription?.subscriptionType.type === 'SINGLE_VISIT') {
        await this.prisma.subscription.update({
          where: { id: attendance.subscriptionId },
          data: {
            remainingVisits: { increment: 1 },
          },
        });
      }

      // Откатить writeOffStatus
      await this.revertInvoiceItemStatus(attendance.subscriptionId);
    }

    // Если меняем НА PRESENT с другого статуса - списать посещение
    if (
      oldStatus !== AttendanceStatus.PRESENT &&
      newStatus === AttendanceStatus.PRESENT
    ) {
      const schedule = await this.prisma.schedule.findUnique({
        where: { id: attendance.scheduleId },
        include: { group: true },
      });

      if (!schedule || !schedule.group) {
        throw new NotFoundException('Расписание или группа не найдены');
      }

      if (!schedule.groupId && dto.subscriptionId) {
        throw new BadRequestException(
          'Невозможно указать основание без привязки к группе',
        );
      }

      const subscription = schedule.groupId
        ? await this.findValidSubscription(
            attendance.clientId,
            schedule.groupId,
            schedule.date,
            dto.subscriptionId,
          )
        : null;

      if (subscription) {
        if (subscription.subscriptionType.type === 'SINGLE_VISIT') {
          if (subscription.remainingVisits <= 0) {
            throw new BadRequestException(
              'На абонементе не осталось посещений',
            );
          }

          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              remainingVisits: subscription.remainingVisits - 1,
            },
          });
        }

        await this.updateInvoiceItemStatus(subscription.id, schedule.date);
      }

      return this.prisma.attendance.update({
        where: { id },
        data: {
          status: newStatus,
          notes: dto.notes,
          markedBy: userId,
          markedAt: new Date(),
          subscriptionId: subscription?.id ?? null,
          subscriptionDeducted: Boolean(subscription),
        },
        include: {
          client: true,
          schedule: { include: { group: true, room: true } },
          subscription: { include: { subscriptionType: true } },
          markedByUser: { select: { firstName: true, lastName: true } },
        },
      });
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: newStatus,
        notes: dto.notes,
        markedBy: userId,
        markedAt: new Date(),
      },
      include: {
        client: true,
        schedule: { include: { group: true, room: true } },
        subscription: { include: { subscriptionType: true } },
        markedByUser: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: { subscription: { include: { subscriptionType: true } } },
    });

    if (!attendance) {
      throw new NotFoundException('Запись посещения не найдена');
    }

    // Если была отметка PRESENT - вернуть посещение
    if (
      attendance.status === AttendanceStatus.PRESENT &&
      attendance.subscriptionDeducted &&
      attendance.subscriptionId
    ) {
      if (attendance.subscription?.subscriptionType.type === 'SINGLE_VISIT') {
        await this.prisma.subscription.update({
          where: { id: attendance.subscriptionId },
          data: {
            remainingVisits: { increment: 1 },
          },
        });
      }

      await this.revertInvoiceItemStatus(attendance.subscriptionId);
    }

    await this.prisma.attendance.delete({ where: { id } });

    return {
      message: 'Запись посещения успешно удалена',
      scheduleId: attendance.scheduleId,
    };
  }

  async findAll(filter: AttendanceFilterDto = {}) {
    const {
      scheduleId,
      groupId,
      clientId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = filter;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (scheduleId) where.scheduleId = scheduleId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    if (groupId) {
      where.schedule = { groupId };
    }

    if (dateFrom || dateTo) {
      where.schedule = {
        ...where.schedule,
        date: {},
      };
      if (dateFrom) where.schedule.date.gte = new Date(dateFrom);
      if (dateTo) where.schedule.date.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ schedule: { date: 'desc' } }, { createdAt: 'desc' }],
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              phone: true,
            },
          },
          schedule: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
              group: {
                select: {
                  id: true,
                  name: true,
                  studio: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          subscription: {
            select: {
              id: true,
              remainingVisits: true,
              subscriptionType: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
          markedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        client: true,
        schedule: { include: { group: true, room: true, teacher: true } },
        subscription: { include: { subscriptionType: true } },
        markedByUser: { select: { firstName: true, lastName: true } },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Запись посещения не найдена');
    }

    return attendance;
  }

  async getBySchedule(scheduleId: string) {
    const attendances = await this.prisma.attendance.findMany({
      where: { scheduleId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
          },
        },
        subscription: {
          select: {
            id: true,
            remainingVisits: true,
            subscriptionType: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        markedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return attendances;
  }

  async getAvailableBases(scheduleId: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { group: true },
    });

    if (!schedule) {
      throw new NotFoundException('Занятие не найдено');
    }

    if (!schedule.groupId) {
      return {
        scheduleId: schedule.id,
        groupId: null,
        date: schedule.date,
        bases: [],
      };
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        groupId: schedule.groupId,
        status: SubscriptionStatus.ACTIVE,
        startDate: { lte: schedule.date },
        endDate: { gte: schedule.date },
        OR: [
          { remainingVisits: null },
          { remainingVisits: { gt: 0 } },
        ],
      },
      include: {
        subscriptionType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const bases = subscriptions.map((subscription) => ({
      id: subscription.id,
      clientId: subscription.clientId,
      subscriptionType: {
        id: subscription.subscriptionTypeId,
        name: subscription.subscriptionType.name,
        type: subscription.subscriptionType.type,
      },
      remainingVisits: subscription.remainingVisits,
      validMonth: subscription.validMonth,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
    }));

    return {
      scheduleId: schedule.id,
      groupId: schedule.groupId,
      date: schedule.date,
      bases,
    };
  }

  async getClientStats(clientId: string, from?: string, to?: string) {
    const where: any = { clientId };

    if (from || to) {
      where.schedule = { date: {} };
      if (from) where.schedule.date.gte = new Date(from);
      if (to) where.schedule.date.lte = new Date(to);
    }

    const [total, present, absent, excused] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.count({
        where: { ...where, status: AttendanceStatus.PRESENT },
      }),
      this.prisma.attendance.count({
        where: { ...where, status: AttendanceStatus.ABSENT },
      }),
      this.prisma.attendance.count({
        where: { ...where, status: AttendanceStatus.EXCUSED },
      }),
    ]);

    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    return {
      total,
      present,
      absent,
      excused,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  }
}
