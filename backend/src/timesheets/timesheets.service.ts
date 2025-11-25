import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TimesheetFilterDto } from './dto/timesheet-filter.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { CreateBulkInvoicesDto } from './dto/create-bulk-invoices.dto';
import { CalendarEventStatus, AttendanceStatus, GroupMemberStatus, ServiceType, WriteOffTiming } from '@prisma/client';

@Injectable()
export class TimesheetsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => InvoicesService))
    private invoicesService: InvoicesService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Получить табель посещаемости для группы за месяц
   */
  async getTimesheet(filter: TimesheetFilterDto) {
    const { groupId, month } = filter;

    if (!groupId) {
      throw new BadRequestException('Необходимо указать группу');
    }

    const currentMonth = month || this.getCurrentMonth();
    const { monthStart, monthEnd } = this.getMonthBoundaries(currentMonth);

    // 1. Получить группу с информацией о студии
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        studio: { select: { id: true, name: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    // 2. Получить все занятия группы за месяц
    const schedules = await this.prisma.schedule.findMany({
      where: {
        groupId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        status: { not: CalendarEventStatus.CANCELLED },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
      },
    });

    // 3. Получить участников группы (текущих и тех, кто был активен в этом месяце)
    const members = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        OR: [
          { status: GroupMemberStatus.ACTIVE },
          {
            status: GroupMemberStatus.EXPELLED,
            leftAt: { gte: monthStart },
          },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            benefitCategory: {
              select: {
                id: true,
                name: true,
                discountPercent: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        client: {
          lastName: 'asc',
        },
      },
    });

    // 4. Получить все посещения за месяц для этих клиентов
    const clientIds = members.map(m => m.clientId);
    const scheduleIds = schedules.map(s => s.id);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        scheduleId: { in: scheduleIds },
        clientId: { in: clientIds },
      },
      include: {
        subscription: {
          select: {
            id: true,
            pricePerLesson: true,
            subscriptionType: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    // 5. Получить абонементы клиентов для этого месяца
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        clientId: { in: clientIds },
        groupId,
        validMonth: currentMonth,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        clientId: true,
        pricePerLesson: true,
        paidPrice: true,
        subscriptionType: {
          select: {
            id: true,
            name: true,
            type: true,
            price: true,
          },
        },
      },
    });

    // 6. Получить существующие компенсации
    const existingCompensations = await this.prisma.compensation.findMany({
      where: {
        clientId: { in: clientIds },
        groupId,
        month: currentMonth,
      },
    });

    // 7. Создаём Map для быстрого поиска O(1)
    const attendancesByClient = new Map<string, typeof attendances>();
    const subscriptionsByClient = new Map<string, typeof subscriptions[0]>();
    const compensationsByClient = new Map<string, typeof existingCompensations[0]>();

    for (const a of attendances) {
      const arr = attendancesByClient.get(a.clientId) || [];
      arr.push(a);
      attendancesByClient.set(a.clientId, arr);
    }
    for (const s of subscriptions) {
      if (!subscriptionsByClient.has(s.clientId)) {
        subscriptionsByClient.set(s.clientId, s);
      }
    }
    for (const c of existingCompensations) {
      compensationsByClient.set(c.clientId, c);
    }

    // 8. Подготовить данные для batch upsert компенсаций
    const compensationsToUpsert: Array<{
      clientId: string;
      excusedCount: number;
      calculatedAmount: number;
    }> = [];

    // 9. Сформировать данные по каждому клиенту (без await внутри!)
    const clientsData = members.map((member) => {
      const clientAttendances = attendancesByClient.get(member.clientId) || [];
      const clientSubscription = subscriptionsByClient.get(member.clientId);
      const existingCompensation = compensationsByClient.get(member.clientId);

      // Сформировать данные по дням занятий
      const attendancesByDate = schedules.map(schedule => {
        const attendance = clientAttendances.find(a => a.scheduleId === schedule.id);
        const dateObj = new Date(schedule.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return {
          date: `${year}-${month}-${day}`,
          scheduleId: schedule.id,
          attendanceId: attendance?.id || null,
          status: attendance?.status || null,
          subscriptionName: attendance?.subscription?.subscriptionType?.name || null,
        };
      });

      // Подсчет статистики
      const present = clientAttendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absent = clientAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const excused = clientAttendances.filter(a => a.status === AttendanceStatus.EXCUSED).length;

      // Рассчитать компенсацию
      let pricePerLesson = 0;
      if (clientSubscription?.pricePerLesson) {
        pricePerLesson = Number(clientSubscription.pricePerLesson);
      } else if (clientSubscription && schedules.length > 0) {
        const paidPrice = Number(clientSubscription.paidPrice);
        pricePerLesson = Math.round(paidPrice / schedules.length);
      }
      const calculatedAmount = excused * pricePerLesson;

      // Запомнить для batch upsert
      if (excused > 0 || existingCompensation) {
        compensationsToUpsert.push({
          clientId: member.clientId,
          excusedCount: excused,
          calculatedAmount,
        });
      }

      // Расчет счета на следующий месяц
      const subscriptionTypePrice = clientSubscription
        ? Number(clientSubscription.subscriptionType.price)
        : 0;

      const benefitCategory = member.client.benefitCategory;
      const discountPercent = benefitCategory?.isActive
        ? Number(benefitCategory.discountPercent)
        : 0;
      const priceWithDiscount = subscriptionTypePrice * (1 - discountPercent / 100);

      const compensationAmount = existingCompensation?.adjustedAmount
        ? Number(existingCompensation.adjustedAmount)
        : calculatedAmount;
      const nextMonthInvoice = subscriptionTypePrice > 0
        ? Math.max(0, Math.round(priceWithDiscount - compensationAmount))
        : null;

      return {
        id: member.client.id,
        firstName: member.client.firstName,
        lastName: member.client.lastName,
        middleName: member.client.middleName,
        phone: member.client.phone,
        memberStatus: member.status,
        attendances: attendancesByDate,
        summary: {
          total: schedules.length,
          present,
          absent,
          excused,
          notMarked: schedules.length - present - absent - excused,
        },
        compensation: {
          id: existingCompensation?.id,
          excusedCount: excused,
          calculatedAmount,
          adjustedAmount: existingCompensation?.adjustedAmount ? Number(existingCompensation.adjustedAmount) : null,
          pricePerLesson,
          notes: existingCompensation?.notes,
          appliedToInvoiceId: existingCompensation?.appliedToInvoiceId,
        },
        subscription: clientSubscription
          ? {
              id: clientSubscription.id,
              name: clientSubscription.subscriptionType.name,
              type: clientSubscription.subscriptionType.type,
              price: subscriptionTypePrice,
            }
          : null,
        nextMonthInvoice,
        benefitDiscount: discountPercent > 0 ? discountPercent : null,
      };
    });

    // 10. Batch upsert компенсаций (один запрос вместо N!)
    if (compensationsToUpsert.length > 0) {
      await this.prisma.$transaction(
        compensationsToUpsert.map((c) =>
          this.prisma.compensation.upsert({
            where: {
              clientId_groupId_month: {
                clientId: c.clientId,
                groupId,
                month: currentMonth,
              },
            },
            update: {
              excusedCount: c.excusedCount,
              calculatedAmount: c.calculatedAmount,
            },
            create: {
              clientId: c.clientId,
              groupId,
              month: currentMonth,
              excusedCount: c.excusedCount,
              calculatedAmount: c.calculatedAmount,
            },
          })
        )
      );
    }

    const clients = clientsData;

    // 11. Сформировать даты занятий
    const scheduleDates = schedules.map(s => {
      // Используем локальное время для форматирования даты
      const dateObj = new Date(s.date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        scheduleId: s.id,
        dayOfWeek: dateObj.toLocaleDateString('ru-RU', { weekday: 'short' }),
        startTime: s.startTime.toISOString(),
      };
    });

    return {
      group: {
        id: group.id,
        name: group.name,
        studio: group.studio,
      },
      month: currentMonth,
      scheduleDates,
      clients,
      totals: {
        totalClients: clients.length,
        totalSchedules: schedules.length,
        totalCompensation: clients.reduce(
          (sum, c) => sum + (c.compensation.adjustedAmount ?? c.compensation.calculatedAmount),
          0
        ),
      },
    };
  }

  /**
   * Обновить компенсацию (ручная корректировка)
   */
  async updateCompensation(id: string, dto: UpdateCompensationDto) {
    const compensation = await this.prisma.compensation.findUnique({
      where: { id },
    });

    if (!compensation) {
      throw new NotFoundException('Компенсация не найдена');
    }

    return this.prisma.compensation.update({
      where: { id },
      data: {
        adjustedAmount: dto.adjustedAmount,
        notes: dto.notes,
      },
    });
  }

  /**
   * Получить список групп с фильтрацией по студии
   */
  async getGroupsForFilter(studioId?: string) {
    const where: any = {
      status: 'ACTIVE',
    };

    if (studioId) {
      where.studioId = studioId;
    }

    return this.prisma.group.findMany({
      where,
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
      orderBy: [
        { studio: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Получить список студий
   */
  async getStudiosForFilter() {
    return this.prisma.studio.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Создать счета для выбранных клиентов на следующий месяц
   */
  async createBulkInvoices(dto: CreateBulkInvoicesDto, managerId?: string) {
    const { clientIds, groupId, targetMonth, sendNotifications } = dto;

    // Получить группу
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        studio: { select: { name: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    // Получить текущий месяц (предыдущий от targetMonth) для компенсаций
    const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
    const currentMonthDate = new Date(targetYear, targetMonthNum - 2, 1);
    const currentMonth = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Получить абонементы клиентов для текущего месяца
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        clientId: { in: clientIds },
        groupId,
        validMonth: currentMonth,
        status: 'ACTIVE',
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            benefitCategory: {
              select: {
                id: true,
                discountPercent: true,
                isActive: true,
              },
            },
          },
        },
        subscriptionType: true,
      },
    });

    // Получить компенсации за текущий месяц
    const compensations = await this.prisma.compensation.findMany({
      where: {
        clientId: { in: clientIds },
        groupId,
        month: currentMonth,
      },
    });

    const compensationMap = new Map(compensations.map(c => [c.clientId, c]));

    // Группируем подписки по клиенту - берем только первую подписку для каждого клиента
    const subscriptionByClient = new Map<string, typeof subscriptions[0]>();
    for (const subscription of subscriptions) {
      if (!subscriptionByClient.has(subscription.clientId)) {
        subscriptionByClient.set(subscription.clientId, subscription);
      }
    }

    const results = {
      created: 0,
      notificationsSent: 0,
      invoiceIds: [] as string[],
    };

    // Создать счета для каждого клиента (по одному счету на клиента)
    for (const [clientId, subscription] of subscriptionByClient) {
      const compensation = compensationMap.get(clientId);
      const compensationAmount = compensation?.adjustedAmount
        ? Number(compensation.adjustedAmount)
        : compensation?.calculatedAmount
          ? Number(compensation.calculatedAmount)
          : 0;

      const subscriptionPrice = Number(subscription.subscriptionType.price);

      // Применяем льготную скидку клиента
      const benefitCategory = subscription.client.benefitCategory;
      const discountPercent = benefitCategory?.isActive
        ? Number(benefitCategory.discountPercent)
        : 0;
      const priceWithDiscount = Math.round(subscriptionPrice * (1 - discountPercent / 100));

      const finalAmount = Math.max(0, priceWithDiscount - compensationAmount);

      // Формируем описание с учетом льготы
      const discountInfo = discountPercent > 0 ? ` (льгота -${discountPercent}%)` : '';
      const compensationInfo = compensationAmount > 0 ? ` (компенсация -${compensationAmount} руб.)` : '';

      try {
        // Создать счет - используем итоговую сумму с учетом льготы
        const invoice = await this.invoicesService.create(
          {
            clientId: clientId,
            items: [
              {
                serviceType: ServiceType.SUBSCRIPTION,
                serviceName: `Абонемент "${subscription.subscriptionType.name}" - ${group.name}`,
                serviceDescription: `Период: ${targetMonth}${discountInfo}${compensationInfo}`,
                quantity: 1,
                basePrice: finalAmount,
                unitPrice: finalAmount,
                vatRate: 0,
                discountPercent: 0,
                writeOffTiming: WriteOffTiming.ON_USE,
              },
            ],
            notes: (discountPercent > 0 || compensationAmount > 0)
              ? `${discountPercent > 0 ? `Применена льгота ${discountPercent}%` : ''}${discountPercent > 0 && compensationAmount > 0 ? ', ' : ''}${compensationAmount > 0 ? `компенсация за ${currentMonth}: -${compensationAmount} руб.` : ''}`
              : undefined,
          },
          managerId,
        );

        results.created++;
        results.invoiceIds.push(invoice.id);

        // Отправить уведомление если нужно
        if (sendNotifications) {
          try {
            await this.notificationsService.sendInvoiceNotification(invoice.id);
            results.notificationsSent++;
          } catch (error) {
            console.error(`Failed to send notification for invoice ${invoice.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to create invoice for client ${clientId}:`, error);
      }
    }

    return results;
  }

  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getMonthBoundaries(month: string): { monthStart: Date; monthEnd: Date } {
    const [year, monthNum] = month.split('-').map(Number);
    // Используем UTC для корректного сравнения с датами в БД
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    // Последний день месяца: переходим на следующий месяц и вычитаем 1 день
    const monthEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
    return { monthStart, monthEnd };
  }
}
