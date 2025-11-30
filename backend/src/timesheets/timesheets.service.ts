import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TimesheetFilterDto } from './dto/timesheet-filter.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { CreateBulkInvoicesDto } from './dto/create-bulk-invoices.dto';
import { CalendarEventStatus, AttendanceStatus, GroupMemberStatus, ServiceType, WriteOffTiming } from '@prisma/client';
import * as ExcelJS from 'exceljs';

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
            paidPrice: true,
            subscriptionType: {
              select: {
                id: true,
                name: true,
                type: true,
                pricePerLesson: true,
              },
            },
          },
        },
        medicalCertificateSchedules: {
          select: {
            id: true,
          },
          take: 1,
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
            pricePerLesson: true,
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

    // 6.1. Получить компенсации из медицинских справок, применённые к этому месяцу
    // (для случаев, когда справка подана позже и компенсация перенесена на другой месяц)
    const medCertCompensations = await this.prisma.medicalCertificateSchedule.findMany({
      where: {
        compensationMonth: currentMonth,
        medicalCertificate: {
          clientId: { in: clientIds },
        },
        compensationAmount: { not: null },
      },
      select: {
        attendanceId: true,
        compensationAmount: true,
        medicalCertificate: {
          select: {
            clientId: true,
          },
        },
      },
    });

    // Группируем компенсации из справок по клиенту
    const medCertCompByClient = new Map<string, number>();
    // Собираем attendanceId, которые были помечены как excused из справок
    // (чтобы не учитывать их повторно в baseCalculatedAmount)
    const medCertAttendanceIds = new Set<string>();
    for (const mc of medCertCompensations) {
      const clientId = mc.medicalCertificate.clientId;
      const amount = Number(mc.compensationAmount) || 0;
      medCertCompByClient.set(clientId, (medCertCompByClient.get(clientId) || 0) + amount);
      if (mc.attendanceId) {
        medCertAttendanceIds.add(mc.attendanceId);
      }
    }

    // 6.2. Получить справки, которые были применены к занятиям этого табеля
    const medCertSchedules = await this.prisma.medicalCertificateSchedule.findMany({
      where: {
        scheduleId: { in: scheduleIds },
        medicalCertificate: {
          clientId: { in: clientIds },
        },
      },
      select: {
        medicalCertificateId: true,
        medicalCertificate: {
          select: {
            id: true,
            clientId: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    // Группируем справки по клиенту (уникальные)
    const medCertsByClient = new Map<string, Array<{ id: string; startDate: Date; endDate: Date }>>();
    for (const mcs of medCertSchedules) {
      const clientId = mcs.medicalCertificate.clientId;
      const certInfo = {
        id: mcs.medicalCertificate.id,
        startDate: mcs.medicalCertificate.startDate,
        endDate: mcs.medicalCertificate.endDate,
      };
      const existing = medCertsByClient.get(clientId) || [];
      // Добавляем только уникальные справки
      if (!existing.some(c => c.id === certInfo.id)) {
        existing.push(certInfo);
      }
      medCertsByClient.set(clientId, existing);
    }

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
      const clientMedCerts = medCertsByClient.get(member.clientId) || [];

      // Сформировать данные по дням занятий
      const attendancesByDate = schedules.map(schedule => {
        const attendance = clientAttendances.find(a => a.scheduleId === schedule.id);
        const dateObj = new Date(schedule.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        // Проверяем, был ли статус установлен по медицинской справке
        const isFromMedicalCertificate = attendance?.medicalCertificateSchedules?.length > 0;
        return {
          date: `${year}-${month}-${day}`,
          scheduleId: schedule.id,
          attendanceId: attendance?.id || null,
          status: attendance?.status || null,
          subscriptionName: attendance?.subscription?.subscriptionType?.name || null,
          isFromMedicalCertificate,
        };
      });

      // Подсчет статистики
      const present = clientAttendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absent = clientAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
      // Общее количество excused (для отображения в UI)
      const excusedTotal = clientAttendances.filter(a => a.status === AttendanceStatus.EXCUSED).length;
      // Только "обычные" excused без справок (для расчёта baseCalculatedAmount, чтобы избежать двойного учёта)
      const excusedWithoutMedCert = clientAttendances.filter(a =>
        a.status === AttendanceStatus.EXCUSED &&
        !medCertAttendanceIds.has(a.id)
      ).length;

      // Рассчитать компенсацию
      // Приоритет: subscriptionType.pricePerLesson → subscription.pricePerLesson → fallback
      let pricePerLesson = 0;
      if (clientSubscription?.subscriptionType?.pricePerLesson) {
        pricePerLesson = Number(clientSubscription.subscriptionType.pricePerLesson);
      } else if (clientSubscription?.pricePerLesson) {
        pricePerLesson = Number(clientSubscription.pricePerLesson);
      } else if (clientSubscription && schedules.length > 0) {
        const paidPrice = Number(clientSubscription.paidPrice);
        pricePerLesson = Math.round(paidPrice / schedules.length);
      }

      // Применяем скидку клиента к цене за занятие для расчета компенсации
      const benefitCategory = member.client.benefitCategory;
      const discountPercent = benefitCategory?.isActive
        ? Number(benefitCategory.discountPercent)
        : 0;
      const pricePerLessonWithDiscount = Math.round(pricePerLesson * (1 - discountPercent / 100) * 100) / 100;

      // Базовая компенсация за пропуски по уважительной причине (без справок) - с учетом скидки
      const baseCalculatedAmount = excusedWithoutMedCert * pricePerLessonWithDiscount;
      // Дополнительная компенсация из медицинских справок (перенесённая на этот месяц)
      const medCertCompensation = medCertCompByClient.get(member.clientId) || 0;
      // Общая рассчитанная компенсация
      const calculatedAmount = baseCalculatedAmount + medCertCompensation;

      // Запомнить для batch upsert
      if (excusedTotal > 0 || existingCompensation) {
        compensationsToUpsert.push({
          clientId: member.clientId,
          excusedCount: excusedTotal,
          calculatedAmount,
        });
      }

      // Расчет счета на следующий месяц
      const subscriptionTypePrice = clientSubscription
        ? Number(clientSubscription.subscriptionType.price)
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
          excused: excusedTotal,
          notMarked: schedules.length - present - absent - excusedTotal,
        },
        compensation: {
          id: existingCompensation?.id,
          excusedCount: excusedTotal,
          calculatedAmount,
          baseCalculatedAmount, // Компенсация за текущий месяц (excused без справок * pricePerLesson со скидкой)
          medCertCompensation, // Компенсация из мед. справок (перенесённая с других месяцев)
          adjustedAmount: existingCompensation?.adjustedAmount ? Number(existingCompensation.adjustedAmount) : null,
          pricePerLesson: pricePerLessonWithDiscount, // Цена за занятие с учетом льготы клиента
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
        medicalCertificates: clientMedCerts.map(c => ({
          id: c.id,
          startDate: c.startDate,
          endDate: c.endDate,
        })),
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
      // Используем UTC для корректного определения дня недели
      const dateObj = new Date(s.date);
      // Корректируем на UTC чтобы избежать сдвига дня
      const utcDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
      const year = utcDate.getFullYear();
      const month = String(utcDate.getMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getDate()).padStart(2, '0');
      // Получаем день недели и приводим к нижнему регистру
      const dayOfWeek = utcDate.toLocaleDateString('ru-RU', { weekday: 'short' }).toLowerCase();
      return {
        date: `${year}-${month}-${day}`,
        scheduleId: s.id,
        dayOfWeek,
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

  /**
   * Экспорт табеля в Excel
   */
  async exportToExcel(filter: TimesheetFilterDto): Promise<Buffer> {
    // 1. Получить данные табеля
    const timesheet = await this.getTimesheet(filter);

    // 2. Создать workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('TDSheet');

    // Шрифт по умолчанию - Arial
    const defaultFont = 'Arial';

    // Настройка ширины колонок
    sheet.columns = [
      { width: 5 },   // A - № п/п
      { width: 15 },  // B - Фамилия
      { width: 15 },  // C - Имя
      { width: 12 },  // D - Плата по ставке
      // Дни 1-31 (E-AI)
      ...Array(31).fill({ width: 3.5 }),
      { width: 8 },   // AJ - Пропущено дней
      { width: 12 },  // AK - Сумма за месяц
      { width: 20 },  // AL - Причины непосещения
    ];

    // 3. Заголовок
    sheet.mergeCells('A2:AK2');
    sheet.getCell('A2').value = 'ТАБЕЛЬ';
    sheet.getCell('A2').font = { name: defaultFont, bold: true, size: 14 };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A3:AK3');
    sheet.getCell('A3').value = 'УЧЕТА ПОСЕЩАЕМОСТИ ДЕТЕЙ';
    sheet.getCell('A3').font = { name: defaultFont, bold: true, size: 12 };
    sheet.getCell('A3').alignment = { horizontal: 'center' };

    // Форматирование месяца
    const [year, monthNum] = timesheet.month.split('-').map(Number);
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const monthName = monthNames[monthNum - 1];

    sheet.mergeCells('A4:AK4');
    sheet.getCell('A4').value = `за период ${monthName} ${year}`;
    sheet.getCell('A4').alignment = { horizontal: 'center' };

    sheet.mergeCells('A5:AK5');
    sheet.getCell('A5').value = timesheet.group.studio?.name || '';
    sheet.getCell('A5').alignment = { horizontal: 'center' };

    // 4. Информационный блок
    sheet.mergeCells('A10:B10');
    sheet.getCell('A10').value = 'Организация';
    sheet.mergeCells('C10:AJ10');
    sheet.getCell('C10').value = 'ГБУ г. Москвы "ОКЦ СВАО"';

    sheet.mergeCells('A11:B11');
    sheet.getCell('A11').value = 'Структурное подразделение';
    sheet.mergeCells('C11:AJ11');
    sheet.getCell('C11').value = `${timesheet.group.studio?.name || ''} "${timesheet.group.name}"`;

    sheet.mergeCells('A12:B12');
    sheet.getCell('A12').value = 'Вид расчета';
    sheet.mergeCells('C12:AJ12');
    sheet.getCell('C12').value = 'Внебюджет';

    // Режим работы (извлекаем уникальные дни недели и сортируем)
    const dayOrder: Record<string, number> = {
      'пн': 1, 'вт': 2, 'ср': 3, 'чт': 4, 'пт': 5, 'сб': 6, 'вс': 7
    };
    const dayNamesMap: Record<string, string> = {
      'пн': 'Понедельник', 'вт': 'Вторник', 'ср': 'Среда',
      'чт': 'Четверг', 'пт': 'Пятница', 'сб': 'Суббота', 'вс': 'Воскресенье'
    };
    const daysOfWeek = [...new Set(timesheet.scheduleDates.map(s => s.dayOfWeek))]
      .filter(d => dayOrder[d] !== undefined) // Только валидные дни
      .sort((a, b) => dayOrder[a] - dayOrder[b]); // Сортировка по порядку
    const workDays = daysOfWeek.map(d => dayNamesMap[d] || d).join(', ');

    sheet.mergeCells('A13:B13');
    sheet.getCell('A13').value = 'Режим работы';
    sheet.mergeCells('C13:AJ13');
    sheet.getCell('C13').value = workDays;

    // Время работы (извлекаем уникальные времена)
    const times = [...new Set(timesheet.scheduleDates.map(s => {
      const date = new Date(s.startTime);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }))];

    sheet.mergeCells('A14:B14');
    sheet.getCell('A14').value = 'Время работы';
    sheet.mergeCells('C14:D14');
    sheet.getCell('C14').value = times.join(', ');

    // 5. Заголовки таблицы (строки 16-17)
    // Строка 16 - основные заголовки
    sheet.mergeCells('A16:A17');
    sheet.getCell('A16').value = '№ п/п';
    sheet.getCell('A16').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell('A16').font = { name: defaultFont, bold: true, size: 9 };

    sheet.mergeCells('B16:C17');
    sheet.getCell('B16').value = 'Фамилия, имя ребенка';
    sheet.getCell('B16').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell('B16').font = { name: defaultFont, bold: true, size: 9 };

    sheet.mergeCells('D16:D17');
    sheet.getCell('D16').value = 'Плата по ставке( по договору)';
    sheet.getCell('D16').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell('D16').font = { bold: true, size: 9 };

    // Заголовок "Дни посещения" охватывает колонки E-AI (дни 1-31)
    sheet.mergeCells('E16:AI16');
    sheet.getCell('E16').value = 'Дни посещения';
    sheet.getCell('E16').alignment = { horizontal: 'center' };
    sheet.getCell('E16').font = { bold: true, size: 9 };

    // Строка 17 - номера дней 1-31
    for (let day = 1; day <= 31; day++) {
      const col = String.fromCharCode(68 + day); // E=69 (ASCII), но 68 + 1 = 69 = 'E'
      const colIndex = 4 + day; // E = 5, F = 6, ...
      sheet.getCell(17, colIndex).value = day;
      sheet.getCell(17, colIndex).alignment = { horizontal: 'center' };
      sheet.getCell(17, colIndex).font = { size: 8 };
    }

    // Пропущено дней (AJ = 36)
    sheet.mergeCells('AJ16:AJ17');
    sheet.getCell('AJ16').value = 'Пропущено дней';
    sheet.getCell('AJ16').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell('AJ16').font = { bold: true, size: 9 };

    // Сумма за месяц (AK = 37)
    sheet.mergeCells('AK16:AK17');
    sheet.getCell('AK16').value = 'Сумма за месяц';
    sheet.getCell('AK16').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell('AK16').font = { bold: true, size: 9 };

    // Причины непосещения (AL = 38)
    sheet.mergeCells('AL16:AL17');
    sheet.getCell('AL16').value = 'Причины непосещения (основание)';
    sheet.getCell('AL16').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell('AL16').font = { bold: true, size: 9 };

    // 6. Данные клиентов (с строки 18)
    // Фильтруем только клиентов с абонементами (не VISIT_PACK)
    const clients = timesheet.clients.filter(c => c.subscription?.type !== 'VISIT_PACK');

    // Создаем Set дат занятий для быстрого поиска
    const scheduleDatesSet = new Set(timesheet.scheduleDates.map(s => {
      const [y, m, d] = s.date.split('-').map(Number);
      return d; // Номер дня в месяце
    }));

    // Добавляем серый фон для заголовков нерабочих дней (строка 17)
    for (let day = 1; day <= 31; day++) {
      if (!scheduleDatesSet.has(day)) {
        const colIndex = 4 + day;
        sheet.getCell(17, colIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      }
    }

    let rowIndex = 18;
    let clientNum = 1;

    for (const client of clients) {
      // № п/п
      sheet.getCell(rowIndex, 1).value = clientNum;
      sheet.getCell(rowIndex, 1).alignment = { horizontal: 'center' };

      // ФИО (объединяем B и C)
      sheet.mergeCells(rowIndex, 2, rowIndex, 3);
      const fullName = `${client.lastName} ${client.firstName}${client.middleName ? ' ' + client.middleName : ''}`;
      sheet.getCell(rowIndex, 2).value = fullName;

      // Плата по ставке (цена абонемента с учетом льготы)
      const subscriptionPrice = client.subscription?.price || 0;
      const discountPercent = client.benefitDiscount || 0;
      const priceWithDiscount = Math.round(subscriptionPrice * (1 - discountPercent / 100));
      sheet.getCell(rowIndex, 4).value = priceWithDiscount;
      sheet.getCell(rowIndex, 4).alignment = { horizontal: 'center' };

      // Создаем Map посещений по дню месяца
      const attendanceByDay = new Map<number, string | null>();
      for (const att of client.attendances) {
        const [y, m, d] = att.date.split('-').map(Number);
        attendanceByDay.set(d, att.status);
      }

      // Заполняем дни 1-31
      for (let day = 1; day <= 31; day++) {
        const colIndex = 4 + day; // E = 5
        const cell = sheet.getCell(rowIndex, colIndex);

        // Проверяем, есть ли занятие в этот день
        if (!scheduleDatesSet.has(day)) {
          // Нет занятия - нерабочий день (серый фон)
          cell.value = 'в';
          cell.alignment = { horizontal: 'center' };
          cell.font = { size: 8 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }, // Светло-серый фон
          };
        } else {
          // Есть занятие - проверяем статус посещения
          const status = attendanceByDay.get(day);
          if (status === 'EXCUSED') {
            cell.value = 'н';
            cell.alignment = { horizontal: 'center' };
            cell.font = { size: 8 };
          } else {
            // PRESENT, ABSENT или null - пустая ячейка
            cell.value = '';
          }
        }
      }

      // Пропущено дней всего (AJ = 36)
      sheet.getCell(rowIndex, 36).value = client.summary.excused;
      sheet.getCell(rowIndex, 36).alignment = { horizontal: 'center' };

      // Сумма за месяц (AK = 37) - используем nextMonthInvoice
      sheet.getCell(rowIndex, 37).value = client.nextMonthInvoice ?? priceWithDiscount;
      sheet.getCell(rowIndex, 37).alignment = { horizontal: 'center' };

      // Причины непосещения (AL = 38)
      const reasons: string[] = [];
      if (client.summary.excused > 0) {
        reasons.push('больничный');
      }
      sheet.getCell(rowIndex, 38).value = reasons.join(', ');

      rowIndex++;
      clientNum++;
    }

    // 7. Итоговая строка "Всего отсутствует"
    sheet.mergeCells(rowIndex, 2, rowIndex, 3);
    sheet.getCell(rowIndex, 4).value = 'Всего отсутствует ';
    sheet.getCell(rowIndex, 4).font = { italic: true };

    rowIndex += 5;

    // 8. Блок подписей
    sheet.getCell(rowIndex, 2).value = 'Руководитель организации';
    sheet.getCell(rowIndex + 1, 2).value = '(ответственный исполнитель)';
    sheet.getCell(rowIndex + 1, 2).font = { size: 8, italic: true };

    sheet.getCell(rowIndex, 19).value = 'Ответственный';
    sheet.getCell(rowIndex + 1, 19).value = 'исполнитель';

    sheet.getCell(rowIndex + 2, 3).value = '(должность)';
    sheet.getCell(rowIndex + 2, 3).font = { size: 8, italic: true };
    sheet.getCell(rowIndex + 2, 5).value = '(подпись)';
    sheet.getCell(rowIndex + 2, 5).font = { size: 8, italic: true };
    sheet.getCell(rowIndex + 2, 12).value = '(расшифровка подписи)';
    sheet.getCell(rowIndex + 2, 12).font = { size: 8, italic: true };

    rowIndex += 5;

    sheet.getCell(rowIndex, 3).value = 'Руководитель кружка';
    sheet.getCell(rowIndex + 1, 5).value = '(подпись)';
    sheet.getCell(rowIndex + 1, 5).font = { size: 8, italic: true };
    sheet.getCell(rowIndex + 1, 12).value = '(расшифровка подписи)';
    sheet.getCell(rowIndex + 1, 12).font = { size: 8, italic: true };
    sheet.getCell(rowIndex + 1, 26).value = '(Дата сдачи табеля)';
    sheet.getCell(rowIndex + 1, 26).font = { size: 8, italic: true };

    rowIndex += 4;

    // 9. Легенда
    sheet.getCell(rowIndex, 2).value = 'В- это те дни когда секция не работает( расписание)';
    sheet.getCell(rowIndex, 2).font = { size: 8, italic: true };

    // 10. Применить границы к таблице данных
    const dataStartRow = 16;
    const dataEndRow = 18 + clients.length;
    for (let row = dataStartRow; row <= dataEndRow; row++) {
      for (let col = 1; col <= 38; col++) {
        const cell = sheet.getCell(row, col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }

    // 11. Применить шрифт Arial ко всем ячейкам
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.font) {
          cell.font = { ...cell.font, name: defaultFont };
        } else {
          cell.font = { name: defaultFont };
        }
      });
    });

    // 12. Вернуть Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
