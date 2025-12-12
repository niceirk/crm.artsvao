import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExportJobService, ExportJob } from './export-job.service';
import { TimesheetFilterDto } from './dto/timesheet-filter.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { CreateBulkInvoicesDto } from './dto/create-bulk-invoices.dto';
import { CalendarEventStatus, AttendanceStatus, GroupMemberStatus, ServiceType, WriteOffTiming } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { ImportAttendanceResult, ImportAttendanceRowResult, ResolveImportConflictsDto } from './dto/import-attendance.dto';

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => InvoicesService))
    private invoicesService: InvoicesService,
    private notificationsService: NotificationsService,
    private exportJobService: ExportJobService,
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

    // 2. Получить все занятия группы за месяц (включая компенсированные отмены)
    const schedules = await this.prisma.safe.schedule.findMany({
      where: {
        groupId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        OR: [
          { status: { not: CalendarEventStatus.CANCELLED } },
          { status: CalendarEventStatus.CANCELLED, isCompensated: true },
        ],
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        isCompensated: true,
        cancellationNote: true,
      },
    });

    // 2.1. Подсчитать количество отменённых занятий с компенсацией
    const cancelledCompensatedSchedules = schedules.filter(
      s => s.status === CalendarEventStatus.CANCELLED && s.isCompensated
    );
    const compensatedCancelledCount = cancelledCompensatedSchedules.length;
    // Set ID отменённых занятий для исключения из excusedWithoutMedCert (чтобы не считать дважды)
    const cancelledScheduleIds = new Set(cancelledCompensatedSchedules.map(s => s.id));

    // 3. Получить участников группы (текущих и тех, кто был активен в этом месяце)
    const members = await this.prisma.safe.groupMember.findMany({
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

    const attendances = await this.prisma.safe.attendance.findMany({
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
    const subscriptions = await this.prisma.safe.subscription.findMany({
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

    // 5.1. Получить активный тип абонемента UNLIMITED для группы (fallback для клиентов без абонемента)
    const defaultSubscriptionType = await this.prisma.subscriptionType.findFirst({
      where: {
        groupId,
        type: 'UNLIMITED',
        isActive: true,
      },
      select: {
        price: true,
        pricePerLesson: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const fallbackPrice = defaultSubscriptionType ? Number(defaultSubscriptionType.price) : 0;
    const fallbackPricePerLesson = defaultSubscriptionType?.pricePerLesson
      ? Number(defaultSubscriptionType.pricePerLesson)
      : (schedules.length > 0 ? Math.round(fallbackPrice / schedules.length) : 0);

    // 6. Получить существующие компенсации
    const existingCompensations = await this.prisma.safe.compensation.findMany({
      where: {
        clientId: { in: clientIds },
        groupId,
        month: currentMonth,
      },
    });

    // 6.1. Получить компенсации из медицинских справок, применённые к этому месяцу
    // (для случаев, когда справка подана позже и компенсация перенесена на другой месяц)
    const medCertCompensations = await this.prisma.safe.medicalCertificateSchedule.findMany({
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
    const medCertSchedules = await this.prisma.safe.medicalCertificateSchedule.findMany({
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

    // 6.3. Получить неоплаченные счета для всех клиентов группы
    const unpaidInvoices = await this.getUnpaidInvoices(clientIds, groupId);

    // Группируем сумму задолженности по клиенту
    const debtByClient = new Map<string, number>();
    for (const invoice of unpaidInvoices) {
      const clientId = invoice.clientId;
      const amount = Number(invoice.totalAmount) || 0;
      debtByClient.set(clientId, (debtByClient.get(clientId) || 0) + amount);
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
        // Занятие отменено (с компенсацией) - нельзя менять статус
        const isScheduleCancelled = schedule.status === CalendarEventStatus.CANCELLED;
        return {
          date: `${year}-${month}-${day}`,
          scheduleId: schedule.id,
          attendanceId: attendance?.id || null,
          status: attendance?.status || null,
          subscriptionName: attendance?.subscription?.subscriptionType?.name || null,
          isFromMedicalCertificate,
          isScheduleCancelled,
          cancellationNote: isScheduleCancelled ? schedule.cancellationNote : null,
        };
      });

      // Подсчет статистики
      const present = clientAttendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absent = clientAttendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
      // Общее количество excused (для отображения в UI)
      const excusedTotal = clientAttendances.filter(a => a.status === AttendanceStatus.EXCUSED).length;
      // Только "обычные" excused без справок и без отменённых занятий
      // (для расчёта baseCalculatedAmount, чтобы избежать двойного учёта с cancelledLessonsCompensation)
      const excusedWithoutMedCert = clientAttendances.filter(a =>
        a.status === AttendanceStatus.EXCUSED &&
        !medCertAttendanceIds.has(a.id) &&
        !cancelledScheduleIds.has(a.scheduleId)  // Исключаем EXCUSED от отменённых занятий
      ).length;

      // Рассчитать компенсацию
      // Приоритет: subscriptionType.pricePerLesson → subscription.pricePerLesson → fallback из группы
      let pricePerLesson = 0;
      if (clientSubscription?.subscriptionType?.pricePerLesson) {
        pricePerLesson = Number(clientSubscription.subscriptionType.pricePerLesson);
      } else if (clientSubscription?.pricePerLesson) {
        pricePerLesson = Number(clientSubscription.pricePerLesson);
      } else if (clientSubscription && schedules.length > 0) {
        const paidPrice = Number(clientSubscription.paidPrice);
        pricePerLesson = Math.round(paidPrice / schedules.length);
      } else {
        // Fallback: использовать цену из активного UNLIMITED типа абонемента группы
        pricePerLesson = fallbackPricePerLesson;
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
      // Компенсация за отменённые занятия с компенсацией
      const cancelledLessonsCompensation = compensatedCancelledCount * pricePerLessonWithDiscount;
      // Задолженность клиента (неоплаченные счета по группе)
      const clientDebtAmount = debtByClient.get(member.clientId) || 0;
      // Общая рассчитанная компенсация (включая отменённые занятия)
      const calculatedAmount = baseCalculatedAmount + medCertCompensation + cancelledLessonsCompensation;

      // Запомнить для batch upsert (включая компенсации за отменённые занятия и задолженность)
      if (excusedTotal > 0 || compensatedCancelledCount > 0 || clientDebtAmount > 0 || existingCompensation) {
        compensationsToUpsert.push({
          clientId: member.clientId,
          excusedCount: excusedTotal,
          calculatedAmount,
        });
      }

      // Расчет счета на следующий месяц
      // Если у клиента нет абонемента, используем цену из активного UNLIMITED типа группы
      const subscriptionTypePrice = clientSubscription
        ? Number(clientSubscription.subscriptionType.price)
        : fallbackPrice;
      const priceWithDiscount = subscriptionTypePrice * (1 - discountPercent / 100);

      // Перерасчёт = Компенсации - Задолженность (с учётом сохранённых настроек)
      // Положительный перерасчёт уменьшает счёт, отрицательный увеличивает
      let recalculationAmount: number;
      if (existingCompensation?.adjustedAmount !== null && existingCompensation?.adjustedAmount !== undefined) {
        // Используем ручную корректировку если она задана
        recalculationAmount = Number(existingCompensation.adjustedAmount);
      } else {
        // Рассчитываем на основе сохранённых настроек
        const includeExcused = existingCompensation?.includeExcused ?? true;
        const includeMedCert = existingCompensation?.includeMedCert ?? true;
        const includeCancelled = existingCompensation?.includeCancelled ?? true;
        const excludedInvoiceIds = new Set(existingCompensation?.excludedInvoiceIds ?? []);

        // Компенсации с учётом настроек
        const effectiveCompensation =
          (includeExcused ? baseCalculatedAmount : 0) +
          (includeMedCert ? medCertCompensation : 0) +
          (includeCancelled ? cancelledLessonsCompensation : 0);

        // Задолженность с учётом исключённых счетов
        const clientInvoices = unpaidInvoices.filter(inv => inv.clientId === member.clientId);
        const effectiveDebt = clientInvoices
          .filter(inv => !excludedInvoiceIds.has(inv.id))
          .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

        recalculationAmount = effectiveCompensation - effectiveDebt;
      }
      const nextMonthInvoice = subscriptionTypePrice > 0
        ? Math.max(0, Math.round(priceWithDiscount - recalculationAmount))
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
          calculatedAmount, // Полная сумма компенсаций (без учёта настроек)
          effectiveRecalculationAmount: recalculationAmount, // Итоговый перерасчёт с учётом настроек
          baseCalculatedAmount, // Компенсация за текущий месяц (excused без справок * pricePerLesson со скидкой)
          medCertCompensation, // Компенсация из мед. справок (перенесённая с других месяцев)
          cancelledLessonsCompensation, // Компенсация за отменённые занятия
          debtAmount: clientDebtAmount, // Полная задолженность (неоплаченные счета)
          adjustedAmount: existingCompensation?.adjustedAmount ? Number(existingCompensation.adjustedAmount) : null,
          pricePerLesson: pricePerLessonWithDiscount, // Цена за занятие с учетом льготы клиента
          notes: existingCompensation?.notes,
          appliedToInvoiceId: existingCompensation?.appliedToInvoiceId,
          // Настройки перерасчёта (из БД)
          includeExcused: existingCompensation?.includeExcused ?? true,
          includeMedCert: existingCompensation?.includeMedCert ?? true,
          includeCancelled: existingCompensation?.includeCancelled ?? true,
          excludedInvoiceIds: existingCompensation?.excludedInvoiceIds ?? [],
          // Детализация (сохранённая)
          savedBaseAmount: existingCompensation?.baseAmount ? Number(existingCompensation.baseAmount) : null,
          savedMedCertAmount: existingCompensation?.medCertAmount ? Number(existingCompensation.medCertAmount) : null,
          savedCancelledAmount: existingCompensation?.cancelledAmount ? Number(existingCompensation.cancelledAmount) : null,
          savedDebtAmount: existingCompensation?.debtAmount ? Number(existingCompensation.debtAmount) : null,
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

    // 10. Batch upsert компенсаций (батчами по 100 для снижения нагрузки)
    if (compensationsToUpsert.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < compensationsToUpsert.length; i += BATCH_SIZE) {
        const batch = compensationsToUpsert.slice(i, i + BATCH_SIZE);
        await this.prisma.$transaction(
          batch.map((c) =>
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
        status: s.status,
        isCompensated: s.isCompensated,
        cancellationNote: s.cancellationNote,
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
   * Обновить компенсацию (ручная корректировка с настройками перерасчёта)
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
        // Настройки перерасчёта
        includeExcused: dto.includeExcused,
        includeMedCert: dto.includeMedCert,
        includeCancelled: dto.includeCancelled,
        excludedInvoiceIds: dto.excludedInvoiceIds,
        // Детализация расчёта
        baseAmount: dto.baseAmount,
        medCertAmount: dto.medCertAmount,
        cancelledAmount: dto.cancelledAmount,
        debtAmount: dto.debtAmount,
      },
    });
  }

  /**
   * Создать или обновить компенсацию по clientId, groupId, month
   */
  async upsertCompensation(dto: UpdateCompensationDto & { clientId: string; groupId: string; month: string }) {
    return this.prisma.compensation.upsert({
      where: {
        clientId_groupId_month: {
          clientId: dto.clientId,
          groupId: dto.groupId,
          month: dto.month,
        },
      },
      create: {
        clientId: dto.clientId,
        groupId: dto.groupId,
        month: dto.month,
        excusedCount: 0,
        calculatedAmount: 0,
        adjustedAmount: dto.adjustedAmount,
        notes: dto.notes,
        includeExcused: dto.includeExcused ?? true,
        includeMedCert: dto.includeMedCert ?? true,
        includeCancelled: dto.includeCancelled ?? true,
        excludedInvoiceIds: dto.excludedInvoiceIds ?? [],
        baseAmount: dto.baseAmount,
        medCertAmount: dto.medCertAmount,
        cancelledAmount: dto.cancelledAmount,
        debtAmount: dto.debtAmount,
      },
      update: {
        adjustedAmount: dto.adjustedAmount,
        notes: dto.notes,
        includeExcused: dto.includeExcused,
        includeMedCert: dto.includeMedCert,
        includeCancelled: dto.includeCancelled,
        excludedInvoiceIds: dto.excludedInvoiceIds,
        baseAmount: dto.baseAmount,
        medCertAmount: dto.medCertAmount,
        cancelledAmount: dto.cancelledAmount,
        debtAmount: dto.debtAmount,
      },
    });
  }

  /**
   * Получить неоплаченные счета клиентов по группе для расчёта задолженности
   */
  async getUnpaidInvoices(clientIds: string[], groupId: string) {
    return this.prisma.safe.invoice.findMany({
      where: {
        clientId: { in: clientIds },
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        items: {
          some: {
            groupId: groupId,
          },
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        clientId: true,
        totalAmount: true,
        status: true,
        issuedAt: true,
        items: {
          where: { groupId },
          select: {
            serviceName: true,
            serviceDescription: true,
          },
        },
      },
      orderBy: { issuedAt: 'asc' },
    });
  }

  /**
   * Получить детализацию перерасчёта для клиента
   */
  async getRecalculationDetails(clientId: string, groupId: string, month: string) {
    const { monthStart, monthEnd } = this.getMonthBoundaries(month);

    // Выполняем все запросы параллельно
    const [compensation, unpaidInvoices, cancelledSchedules] = await Promise.all([
      // 1. Получить компенсацию клиента
      this.prisma.compensation.findUnique({
        where: {
          clientId_groupId_month: { clientId, groupId, month },
        },
      }),
      // 2. Получить неоплаченные счета
      this.getUnpaidInvoices([clientId], groupId),
      // 3. Получить отменённые занятия с компенсацией
      this.prisma.schedule.findMany({
        where: {
          groupId,
          date: { gte: monthStart, lte: monthEnd },
          status: CalendarEventStatus.CANCELLED,
          isCompensated: true,
        },
        select: {
          id: true,
          date: true,
          cancellationNote: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    return {
      compensation: compensation
        ? {
            id: compensation.id,
            excusedCount: compensation.excusedCount,
            calculatedAmount: Number(compensation.calculatedAmount),
            adjustedAmount: compensation.adjustedAmount ? Number(compensation.adjustedAmount) : null,
            notes: compensation.notes,
            includeExcused: compensation.includeExcused,
            includeMedCert: compensation.includeMedCert,
            includeCancelled: compensation.includeCancelled,
            excludedInvoiceIds: compensation.excludedInvoiceIds,
            baseAmount: compensation.baseAmount ? Number(compensation.baseAmount) : null,
            medCertAmount: compensation.medCertAmount ? Number(compensation.medCertAmount) : null,
            cancelledAmount: compensation.cancelledAmount ? Number(compensation.cancelledAmount) : null,
            debtAmount: compensation.debtAmount ? Number(compensation.debtAmount) : null,
          }
        : null,
      unpaidInvoices: unpaidInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: Number(inv.totalAmount),
        status: inv.status,
        issuedAt: inv.issuedAt.toISOString(),
        period: inv.items[0]?.serviceDescription || '',
      })),
      cancelledSchedules: cancelledSchedules.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        note: s.cancellationNote,
      })),
    };
  }

  /**
   * Импорт посещаемости из Excel файла (ОтчетГруппа.xlsx)
   * Оптимизированная версия: загружаем все данные разом, используем batch операции
   */
  async importAttendance(
    file: Express.Multer.File,
    groupId: string,
  ): Promise<ImportAttendanceResult> {
    // Проверяем существование группы
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    // Парсим Excel файл
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });

    // Пропускаем заголовки (строки 0-6), данные начинаются с 7-й строки
    const dataRows = rows.slice(7).filter(
      (row) => row[0] && row[1] && row[2],
    );

    if (dataRows.length === 0) {
      return {
        success: true,
        summary: {
          total: 0,
          imported: 0,
          skipped: 0,
          conflicts: 0,
          clientNotFound: 0,
          scheduleNotFound: 0,
        },
        results: [],
      };
    }

    // === ОПТИМИЗАЦИЯ: Загружаем все данные одним запросом ===

    // 1. Получаем участников группы
    const groupMembers = await this.prisma.safe.groupMember.findMany({
      where: {
        groupId,
        status: { in: [GroupMemberStatus.ACTIVE, GroupMemberStatus.EXPELLED] },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    });

    // 2. Собираем уникальные даты из файла
    const uniqueDates = new Set<string>();
    for (const row of dataRows) {
      const parsed = this.parseDateTimeFromExcel(String(row[0] || ''));
      if (parsed) {
        uniqueDates.add(parsed.date.toISOString().split('T')[0]);
      }
    }

    // 3. Загружаем расписания только для дат из файла (оптимизация)
    const minDate = [...uniqueDates].sort()[0];
    const maxDate = [...uniqueDates].sort().pop();
    const schedules = await this.prisma.safe.schedule.findMany({
      where: {
        groupId,
        status: { not: CalendarEventStatus.CANCELLED },
        // Фильтруем по диапазону дат из файла
        ...(minDate && maxDate ? {
          date: {
            gte: new Date(minDate),
            lte: new Date(maxDate + 'T23:59:59.999Z'),
          },
        } : {}),
      },
      select: { id: true, date: true },
    });

    // Создаем Map: dateString -> scheduleId
    const scheduleByDate = new Map<string, string>();
    for (const s of schedules) {
      const dateKey = new Date(s.date).toISOString().split('T')[0];
      scheduleByDate.set(dateKey, s.id);
    }

    // 4. Загружаем все существующие записи посещаемости для группы
    const scheduleIds = schedules.map(s => s.id);
    const clientIds = groupMembers.map(m => m.clientId);

    const existingAttendances = await this.prisma.safe.attendance.findMany({
      where: {
        scheduleId: { in: scheduleIds },
        clientId: { in: clientIds },
      },
      select: {
        id: true,
        scheduleId: true,
        clientId: true,
        status: true,
      },
    });

    // Создаем Map: "scheduleId:clientId" -> attendance
    const attendanceMap = new Map<string, typeof existingAttendances[0]>();
    for (const a of existingAttendances) {
      attendanceMap.set(`${a.scheduleId}:${a.clientId}`, a);
    }

    // Маппинг статусов из Excel в систему
    const statusMap: Record<string, AttendanceStatus> = {
      'Посещал': AttendanceStatus.PRESENT,
      'Не посещал': AttendanceStatus.ABSENT,
      'Болел': AttendanceStatus.EXCUSED,
    };

    const results: ImportAttendanceRowResult[] = [];
    const summary = {
      total: dataRows.length,
      imported: 0,
      skipped: 0,
      conflicts: 0,
      clientNotFound: 0,
      scheduleNotFound: 0,
    };

    // Собираем записи для batch создания и обновления
    const toCreate: Array<{
      scheduleId: string;
      clientId: string;
      status: AttendanceStatus;
      markedAt: Date;
    }> = [];
    const toUpdate: Array<{
      id: string;
      status: AttendanceStatus;
    }> = [];

    const now = new Date();

    // === Обрабатываем каждую строку (без запросов к БД) ===
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 8;
      const dateTimeStr = String(row[0] || '');
      const fioStr = String(row[1] || '');
      const statusStr = String(row[2] || '').trim();

      // Парсим дату и время
      const parsedDateTime = this.parseDateTimeFromExcel(dateTimeStr);
      if (!parsedDateTime) {
        results.push({
          row: rowNum,
          fio: fioStr,
          dateTime: dateTimeStr,
          status: 'schedule_not_found',
          message: 'Не удалось распознать дату и время',
        });
        summary.scheduleNotFound++;
        continue;
      }

      // Парсим ФИО и ищем клиента (в памяти)
      const parsedFIO = this.parseFIO(fioStr);
      const client = this.findClientByFIO(groupMembers, parsedFIO);

      // Маппим статус заранее (нужен для possibleClients)
      const newStatus = statusMap[statusStr];

      if (!client) {
        // Ищем похожих клиентов для ручной привязки
        const possibleClients = groupMembers
          .filter((m) => {
            const lnLower = m.client.lastName.toLowerCase();
            const parsedLower = parsedFIO.lastName.toLowerCase();
            return (
              lnLower.includes(parsedLower.slice(0, 3)) ||
              parsedLower.includes(lnLower.slice(0, 3))
            );
          })
          .slice(0, 5)
          .map((m) => ({
            id: m.client.id,
            firstName: m.client.firstName,
            lastName: m.client.lastName,
            middleName: m.client.middleName,
          }));

        // Ищем занятие по дате для возможности ручной привязки
        const dateKey = parsedDateTime.date.toISOString().split('T')[0];
        const scheduleIdForNotFound = scheduleByDate.get(dateKey);

        results.push({
          row: rowNum,
          fio: fioStr,
          dateTime: dateTimeStr,
          status: 'client_not_found',
          message: `Клиент "${fioStr}" не найден в группе`,
          scheduleId: scheduleIdForNotFound,
          newStatus: newStatus,
          possibleClients: possibleClients.length > 0 ? possibleClients : undefined,
        });
        summary.clientNotFound++;
        continue;
      }

      // Ищем занятие по дате (в памяти)
      const dateKey = parsedDateTime.date.toISOString().split('T')[0];
      const scheduleId = scheduleByDate.get(dateKey);
      if (!scheduleId) {
        results.push({
          row: rowNum,
          fio: fioStr,
          dateTime: dateTimeStr,
          status: 'schedule_not_found',
          message: `Занятие на дату ${parsedDateTime.date.toLocaleDateString('ru-RU')} не найдено`,
        });
        summary.scheduleNotFound++;
        continue;
      }

      // Проверяем, что статус валидный (уже смаппили выше)
      if (!newStatus) {
        results.push({
          row: rowNum,
          fio: fioStr,
          dateTime: dateTimeStr,
          status: 'schedule_not_found',
          message: `Неизвестный статус: "${statusStr}"`,
        });
        summary.scheduleNotFound++;
        continue;
      }

      // Проверяем существующую запись (в памяти)
      const existingKey = `${scheduleId}:${client.id}`;
      const existingAttendance = attendanceMap.get(existingKey);

      if (existingAttendance && existingAttendance.status) {
        if (existingAttendance.status === newStatus) {
          // Статусы совпадают - пропускаем
          results.push({
            row: rowNum,
            fio: fioStr,
            dateTime: dateTimeStr,
            status: 'skipped',
            message: `Статус совпадает: ${this.statusToRussian(existingAttendance.status)}`,
            existingStatus: existingAttendance.status,
            newStatus,
            attendanceId: existingAttendance.id,
            scheduleId,
            clientId: client.id,
          });
          summary.skipped++;
        } else {
          // КОНФЛИКТ: статусы различаются
          results.push({
            row: rowNum,
            fio: fioStr,
            dateTime: dateTimeStr,
            status: 'conflict',
            message: `${this.statusToRussian(newStatus)}`,
            existingStatus: existingAttendance.status,
            newStatus,
            attendanceId: existingAttendance.id,
            scheduleId,
            clientId: client.id,
          });
          summary.conflicts++;
        }
        continue;
      }

      // Добавляем в batch
      if (existingAttendance) {
        toUpdate.push({ id: existingAttendance.id, status: newStatus });
      } else {
        toCreate.push({
          scheduleId,
          clientId: client.id,
          status: newStatus,
          markedAt: now,
        });
      }

      results.push({
        row: rowNum,
        fio: fioStr,
        dateTime: dateTimeStr,
        status: 'imported',
        message: 'Успешно импортировано',
        newStatus: newStatus,
      });
      summary.imported++;
    }

    // === Batch операции (батчами по 100 для снижения нагрузки) ===
    const BATCH_SIZE = 100;

    // Batch создание новых записей
    if (toCreate.length > 0) {
      for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
        const batch = toCreate.slice(i, i + BATCH_SIZE);
        await this.prisma.attendance.createMany({ data: batch });
      }
    }

    // Batch обновление существующих записей
    if (toUpdate.length > 0) {
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await this.prisma.$transaction(
          batch.map((u) =>
            this.prisma.attendance.update({
              where: { id: u.id },
              data: { status: u.status, markedAt: now },
            }),
          ),
        );
      }
    }

    return {
      success: true,
      summary,
      results,
    };
  }

  /**
   * Разрешение конфликтов импорта посещаемости
   * Применяет решения пользователя: обновление или создание записей
   */
  async resolveImportConflicts(dto: ResolveImportConflictsDto): Promise<{
    updated: number;
    created: number;
    skipped: number;
  }> {
    const result = { updated: 0, created: 0, skipped: 0 };
    const now = new Date();

    const toCreate: Array<{
      scheduleId: string;
      clientId: string;
      status: AttendanceStatus;
      markedAt: Date;
    }> = [];

    const toUpdate: Array<{
      id: string;
      status: AttendanceStatus;
    }> = [];

    // Сортируем решения по типу операции
    for (const item of dto.resolutions) {
      if (item.resolution === 'skip' || item.resolution === 'keep_crm') {
        result.skipped++;
        continue;
      }

      // use_file - применяем статус из файла
      if (item.attendanceId) {
        // Обновление существующей записи
        toUpdate.push({ id: item.attendanceId, status: item.status });
        result.updated++;
      } else if (item.scheduleId && item.clientId) {
        // Создание новой записи (для ручной привязки клиента)
        toCreate.push({
          scheduleId: item.scheduleId,
          clientId: item.clientId,
          status: item.status,
          markedAt: now,
        });
        result.created++;
      }
    }

    // Batch операции для оптимизации
    const BATCH_SIZE = 100;

    // Batch создание новых записей
    if (toCreate.length > 0) {
      for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
        await this.prisma.attendance.createMany({
          data: toCreate.slice(i, i + BATCH_SIZE),
        });
      }
    }

    // Batch обновление существующих записей
    if (toUpdate.length > 0) {
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await this.prisma.$transaction(
          batch.map(u =>
            this.prisma.attendance.update({
              where: { id: u.id },
              data: { status: u.status, markedAt: now },
            })
          )
        );
      }
    }

    return result;
  }

  /**
   * Парсинг даты и времени из формата "02.12.2025, 17:00"
   */
  private parseDateTimeFromExcel(
    value: string,
  ): { date: Date; time: string } | null {
    const match = value.match(
      /(\d{2})\.(\d{2})\.(\d{4}),?\s*(\d{2}):(\d{2})/,
    );
    if (!match) return null;

    const [, day, month, year, hours, minutes] = match;
    return {
      date: new Date(
        Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)),
      ),
      time: `${hours}:${minutes}`,
    };
  }

  /**
   * Парсинг ФИО из строки (может быть "Фамилия Имя -" или "Фамилия Имя Отчество")
   */
  private parseFIO(fio: string): {
    lastName: string;
    firstName: string;
    middleName?: string;
  } {
    // Убираем суффикс " -" если есть
    const cleaned = fio.replace(/\s*-\s*$/, '').trim();
    const parts = cleaned.split(/\s+/);

    if (parts.length >= 3) {
      return {
        lastName: parts[0],
        firstName: parts[1],
        middleName: parts.slice(2).join(' '),
      };
    } else if (parts.length === 2) {
      return {
        lastName: parts[0],
        firstName: parts[1],
      };
    } else {
      return {
        lastName: parts[0] || '',
        firstName: '',
      };
    }
  }

  /**
   * Поиск клиента по ФИО среди участников группы
   */
  private findClientByFIO(
    groupMembers: Array<{
      client: {
        id: string;
        firstName: string;
        lastName: string;
        middleName: string | null;
      };
    }>,
    fio: { lastName: string; firstName: string; middleName?: string },
  ): { id: string } | null {
    // Точное совпадение фамилии и имени (case-insensitive)
    const exactMatch = groupMembers.find(
      (m) =>
        m.client.lastName.toLowerCase() === fio.lastName.toLowerCase() &&
        m.client.firstName.toLowerCase() === fio.firstName.toLowerCase(),
    );

    if (exactMatch) return { id: exactMatch.client.id };

    // Частичное совпадение (если имя сокращено)
    const partialMatch = groupMembers.find(
      (m) =>
        m.client.lastName.toLowerCase() === fio.lastName.toLowerCase() &&
        fio.firstName.length >= 2 &&
        m.client.firstName
          .toLowerCase()
          .startsWith(fio.firstName.toLowerCase().slice(0, 2)),
    );

    return partialMatch ? { id: partialMatch.client.id } : null;
  }

  /**
   * Перевод статуса на русский для сообщений
   */
  private statusToRussian(status: AttendanceStatus): string {
    const map: Record<AttendanceStatus, string> = {
      PRESENT: 'Присутствовал',
      ABSENT: 'Отсутствовал',
      EXCUSED: 'Уважительная причина',
    };
    return map[status] || status;
  }

  /**
   * Получить список групп с фильтрацией по студии
   */
  async getGroupsForFilter(studioId?: string) {
    const where: any = {
      status: 'ACTIVE',
      isPaid: true,
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
    const subscriptions = await this.prisma.safe.subscription.findMany({
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
    const compensations = await this.prisma.safe.compensation.findMany({
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
            this.logger.error(`Failed to send notification for invoice ${invoice.id}:`, error);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to create invoice for client ${clientId}:`, error);
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

  /**
   * Запуск асинхронного экспорта табеля в Excel.
   * Возвращает ID задачи, которую можно отслеживать через getExportJob.
   */
  async startExportAsync(filter: TimesheetFilterDto): Promise<{ jobId: string }> {
    const job = this.exportJobService.createJob(filter);

    // Запускаем экспорт асинхронно (не ждём завершения)
    this.processExportJob(job.id).catch((error) => {
      this.logger.error(`Export job ${job.id} failed: ${error.message}`);
    });

    return { jobId: job.id };
  }

  /**
   * Получить статус задачи экспорта
   */
  getExportJob(jobId: string): ExportJob {
    return this.exportJobService.getJob(jobId);
  }

  /**
   * Получить результат экспорта (Buffer)
   */
  getExportResult(jobId: string): Buffer | null {
    const job = this.exportJobService.getJob(jobId);
    if (job.status !== 'completed' || !job.result) {
      return null;
    }
    // Очищаем результат после скачивания для экономии памяти
    const result = job.result;
    this.exportJobService.clearJobResult(jobId);
    return result;
  }

  /**
   * Обработка задачи экспорта в фоне
   */
  private async processExportJob(jobId: string): Promise<void> {
    try {
      this.exportJobService.updateJobStatus(jobId, 'processing', { progress: 0 });

      const job = this.exportJobService.getJob(jobId);

      // Генерируем Excel
      const buffer = await this.exportToExcel(job.filter);

      this.exportJobService.updateJobStatus(jobId, 'completed', { result: buffer, progress: 100 });
      this.logger.log(`Export job ${jobId} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.exportJobService.updateJobStatus(jobId, 'failed', { error: errorMessage });
      this.logger.error(`Export job ${jobId} failed: ${errorMessage}`);
      throw error;
    }
  }
}
