import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GroupsService } from '../groups/groups.service';
import { SellSubscriptionDto } from './dto/sell-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';
import {
  Prisma,
  SubscriptionStatus,
  ServiceType,
  WriteOffTiming,
  CalendarEventStatus,
} from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private invoicesService: InvoicesService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => GroupsService))
    private groupsService: GroupsService,
  ) {}

  /**
   * Продажа абонемента с автоматическим созданием Invoice
   * Использует транзакцию для обеспечения целостности данных
   */
  async sellSubscription(sellDto: SellSubscriptionDto, managerId?: string) {
    // 1. Получить тип абонемента (вне транзакции - только чтение)
    const subscriptionType = await this.prisma.subscriptionType.findUnique({
      where: { id: sellDto.subscriptionTypeId },
      include: { group: true },
    });

    if (!subscriptionType) {
      throw new NotFoundException('Subscription type not found');
    }

    if (!subscriptionType.isActive) {
      throw new BadRequestException('Subscription type is not active');
    }

    // 2. Получить клиента с льготной категорией (вне транзакции - только чтение)
    const client = await this.prisma.client.findUnique({
      where: { id: sellDto.clientId },
      include: { benefitCategory: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // 3. Рассчитать даты и цены
    const purchaseDate = this.startOfDay(new Date());
    const selectedStartDate = this.normalizeStartDate(sellDto.startDate, purchaseDate);
    const calculationStartDate = selectedStartDate > purchaseDate ? selectedStartDate : purchaseDate;
    const resolvedValidMonth = sellDto.validMonth || this.formatValidMonth(selectedStartDate);
    const { startDate, endDate } = this.calculateSubscriptionDates(
      resolvedValidMonth,
      calculationStartDate,
    );
    const lessonStats = await this.getPlannedLessonsStats(
      sellDto.groupId,
      resolvedValidMonth,
      calculationStartDate,
    );

    const applyBenefit = sellDto.applyBenefit ?? true;

    const { originalPrice, discountAmount, finalPrice, pricePerLesson, pricePerLessonWithDiscount } =
      this.calculateSubscriptionPrice({
        basePrice: subscriptionType.price,
        benefitCategory: client.benefitCategory,
        purchasedMonths: sellDto.purchasedMonths || 1,
        applyBenefit,
        lessonStats,
      });

    // 4. Проверить минимальный порог (для первого месяца)
    if (sellDto.purchasedMonths === 1) {
      this.validateMinimumThreshold(lessonStats.remainingPlanned);
    }

    // 5. Выполнить все критические операции в транзакции
    const subscription = await this.prisma.$transaction(async (tx) => {
      // 5.1. Создать абонемент
      const newSubscription = await tx.subscription.create({
        data: {
          clientId: sellDto.clientId,
          subscriptionTypeId: sellDto.subscriptionTypeId,
          groupId: sellDto.groupId,
          validMonth: resolvedValidMonth,
          purchaseDate,
          startDate,
          endDate,
          originalPrice: originalPrice,
          discountAmount: discountAmount,
          paidPrice: finalPrice,
          pricePerLesson: pricePerLessonWithDiscount,
          remainingVisits:
            subscriptionType.type === 'SINGLE_VISIT'
              ? this.calculateRemainingVisits(purchaseDate, endDate)
              : null,
          purchasedMonths: sellDto.purchasedMonths || 1,
          status: 'ACTIVE',
        },
      });

      // 5.2. Добавить клиента в группу (если его там нет)
      const existingMember = await tx.groupMember.findUnique({
        where: {
          groupId_clientId: {
            groupId: sellDto.groupId,
            clientId: sellDto.clientId,
          },
        },
      });

      if (!existingMember) {
        // Проверяем лимит группы
        const group = await tx.group.findUnique({
          where: { id: sellDto.groupId },
          select: { maxParticipants: true },
        });

        const currentMemberCount = await tx.groupMember.count({
          where: { groupId: sellDto.groupId, status: 'ACTIVE' },
        });

        const shouldWaitlist = group?.maxParticipants ? currentMemberCount >= group.maxParticipants : false;
        const waitlistPosition = shouldWaitlist
          ? (await tx.groupMember.count({ where: { groupId: sellDto.groupId, status: 'WAITLIST' } })) + 1
          : null;

        await tx.groupMember.create({
          data: {
            groupId: sellDto.groupId,
            clientId: sellDto.clientId,
            status: shouldWaitlist ? 'WAITLIST' : 'ACTIVE',
            waitlistPosition,
          },
        });

        console.log(
          shouldWaitlist
            ? `⚠️ Client ${sellDto.clientId} added to waitlist (position ${waitlistPosition}) for group ${sellDto.groupId}`
            : `✅ Client ${sellDto.clientId} automatically added to group ${sellDto.groupId}`,
        );
      }

      // 5.3. Создать Invoice с InvoiceItem
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: sellDto.clientId,
          subscriptionId: newSubscription.id,
          subtotal: originalPrice,
          discountAmount,
          totalAmount: finalPrice,
          status: 'PENDING',
          notes: sellDto.notes,
          issuedAt: new Date(),
          createdBy: managerId,
          items: {
            create: {
              serviceType: ServiceType.SUBSCRIPTION,
              serviceName: `Абонемент "${subscriptionType.name}" - ${subscriptionType.group.name}`,
              serviceDescription: `Период: ${resolvedValidMonth} (${sellDto.purchasedMonths || 1} мес.) — ${lessonStats.remainingPlanned} занятий`,
              quantity: lessonStats.remainingPlanned,
              basePrice: Number(pricePerLesson),
              unitPrice: Number(pricePerLesson),
              vatRate: 0,
              vatAmount: 0,
              discountPercent:
                applyBenefit && client.benefitCategory?.isActive
                  ? Number(client.benefitCategory.discountPercent)
                  : 0,
              totalPrice: finalPrice,
              writeOffTiming: WriteOffTiming.ON_USE,
            },
          },
        },
      });

      console.log(`✅ Created subscription ${newSubscription.id} with invoice ${invoice.id}`);

      // Вернуть абонемент с нужными связями
      return tx.subscription.findUnique({
        where: { id: newSubscription.id },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              benefitCategory: true,
            },
          },
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
          subscriptionType: true,
        },
      });
    });

    // 6. Отправить уведомление клиенту (вне транзакции - не критично)
    try {
      await this.notificationsService.sendSubscriptionPurchaseConfirmation(
        subscription!.id,
      );
    } catch (error) {
      console.error(
        'Failed to send subscription purchase notification:',
        error,
      );
      // Не прерываем выполнение если уведомление не отправилось
    }

    return subscription;
  }

  /**
   * Рассчитать даты абонемента (startDate, endDate)
   */
  private calculateSubscriptionDates(
    validMonth: string,
    startDateInput: Date,
  ): { startDate: Date; endDate: Date } {
    const { year, month } = this.parseValidMonth(validMonth);

    const monthStart = this.startOfDay(new Date(year, month - 1, 1));
    const startDate =
      startDateInput > monthStart ? startDateInput : monthStart;

    const endDate = this.endOfDay(new Date(year, month, 0));

    return { startDate, endDate };
  }

  /**
   * Получить статистику по запланированным занятиям для расчета цены
   */
  private async getPlannedLessonsStats(
    groupId: string,
    validMonth: string,
    calculationStart: Date,
  ): Promise<{
    totalPlanned: number;
    remainingPlanned: number;
  }> {
    const { year, month } = this.parseValidMonth(validMonth);
    const monthStart = this.startOfDay(new Date(year, month - 1, 1));
    const monthEnd = this.endOfDay(new Date(year, month, 0));
    const normalizedCalculationStart =
      calculationStart > monthStart ? calculationStart : monthStart;

    const schedules = await this.prisma.schedule.findMany({
      where: {
        groupId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        status: CalendarEventStatus.PLANNED,
        isRecurring: false,
      },
      select: {
        date: true,
      },
    });

    const totalPlanned = schedules.length;
    const remainingPlanned = schedules.filter((schedule) => {
      const scheduleDate = this.startOfDay(new Date(schedule.date));
      return scheduleDate >= normalizedCalculationStart;
    }).length;

    if (totalPlanned === 0) {
      throw new BadRequestException('Нет запланированных занятий для выбранного месяца');
    }

    return {
      totalPlanned,
      remainingPlanned,
    };
  }

  /**
   * Рассчитать цену абонемента на основе количества занятий и льгот
   */
  private calculateSubscriptionPrice({
    basePrice,
    benefitCategory,
    purchasedMonths,
    applyBenefit,
    lessonStats,
  }: {
    basePrice: Prisma.Decimal | number;
    benefitCategory: {
      id: string;
      discountPercent: Prisma.Decimal;
      isActive: boolean;
    } | null;
    purchasedMonths: number;
    applyBenefit: boolean;
    lessonStats: {
      totalPlanned: number;
      remainingPlanned: number;
    };
  }): {
      originalPrice: number;
      discountAmount: number;
      finalPrice: number;
      pricePerLesson: number;
      pricePerLessonWithDiscount: number;
    } {
    const basePriceNum = Number(basePrice);
    const { totalPlanned, remainingPlanned } = lessonStats;

    if (totalPlanned <= 0) {
      throw new BadRequestException('Нет запланированных занятий для выбранного месяца');
    }

    if (remainingPlanned <= 0) {
      throw new BadRequestException(
        'Нет доступных запланированных занятий до конца выбранного месяца',
      );
    }

    const pricePerLesson = Math.round(basePriceNum / totalPlanned);
    const firstMonthPrice = pricePerLesson * remainingPlanned;
    const otherMonthsPrice = basePriceNum * (purchasedMonths - 1);
    const totalPrice = firstMonthPrice + otherMonthsPrice;

    let discountAmount = 0;
    let discountPercent = 0;
    if (applyBenefit && benefitCategory && benefitCategory.isActive) {
      discountPercent = Number(benefitCategory.discountPercent);
      discountAmount = (totalPrice * discountPercent) / 100;
    }

    const finalPrice = totalPrice - discountAmount;

    // Стоимость 1 занятия с учетом скидки (для расчета компенсаций)
    const pricePerLessonWithDiscount = pricePerLesson * (1 - discountPercent / 100);

    return {
      originalPrice: this.toMoney(totalPrice),
      discountAmount: this.toMoney(discountAmount),
      finalPrice: this.toMoney(finalPrice),
      pricePerLesson: this.toMoney(pricePerLesson),
      pricePerLessonWithDiscount: this.toMoney(pricePerLessonWithDiscount),
    };
  }

  /**
   * Проверить минимальный порог занятий (≥3 занятия до конца месяца)
   */
  private validateMinimumThreshold(remainingLessons: number): void {
    if (remainingLessons < 3) {
      throw new BadRequestException(
        `Недостаточно занятий до конца месяца (осталось ${remainingLessons}, минимум 3). Купите абонемент на следующий месяц.`,
      );
    }
  }

  /**
   * Рассчитать остаток посещений для разовых абонементов
   */
  private calculateRemainingVisits(
    purchaseDate: Date,
    endDate: Date,
  ): number {
    const days = Math.ceil(
      (endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    // Примерно 2 занятия в неделю × количество недель
    return Math.ceil((days / 7) * 2);
  }

  private normalizeStartDate(startDate: string | undefined, fallback: Date): Date {
    if (!startDate) {
      return this.startOfDay(fallback);
    }

    const parsed = new Date(startDate);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException('Некорректная дата начала занятий');
    }

    return this.startOfDay(parsed);
  }

  private formatValidMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private startOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private endOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);
    return normalized;
  }

  private toMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Парсинг и валидация формата validMonth (YYYY-MM)
   */
  private parseValidMonth(validMonth: string): { year: number; month: number } {
    if (!validMonth || typeof validMonth !== 'string') {
      throw new BadRequestException('Некорректный формат месяца: значение отсутствует');
    }

    const parts = validMonth.split('-');
    if (parts.length !== 2) {
      throw new BadRequestException(`Некорректный формат месяца: "${validMonth}". Ожидается YYYY-MM`);
    }

    const [yearStr, monthStr] = parts;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month)) {
      throw new BadRequestException(`Некорректный формат месяца: "${validMonth}". Год и месяц должны быть числами`);
    }

    if (year < 2000 || year > 2100) {
      throw new BadRequestException(`Некорректный год: ${year}. Допустимый диапазон: 2000-2100`);
    }

    if (month < 1 || month > 12) {
      throw new BadRequestException(`Некорректный месяц: ${month}. Допустимый диапазон: 1-12`);
    }

    return { year, month };
  }

  /**
   * Получить список абонементов с фильтрацией
   */
  async findAll(filter: SubscriptionFilterDto = {}) {
    const {
      clientId,
      groupId,
      status,
      statusCategory,
      sortBy,
      sortOrder,
      validMonth,
      page = 1,
      limit = 50,
    } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (groupId) where.groupId = groupId;
    const activeStatuses =
      statusCategory === 'ACTIVE'
        ? ['ACTIVE']
        : statusCategory === 'INACTIVE'
          ? ['EXPIRED', 'FROZEN', 'CANCELLED']
          : [];
    if (statusCategory === 'ACTIVE' || statusCategory === 'INACTIVE') {
      where.status = { in: activeStatuses as SubscriptionStatus[] };
    } else if (status) {
      where.status = status;
    }
    if (validMonth) where.validMonth = validMonth;

    const orderByCriteria =
      sortBy && ['purchaseDate', 'createdAt'].includes(sortBy)
        ? [{ [sortBy]: sortOrder ?? 'desc' as Prisma.SortOrder }]
        : [{ createdAt: 'desc' as Prisma.SortOrder }];

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByCriteria,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
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
          subscriptionType: true,
        },
      }),
      this.prisma.subscription.count({ where }),
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

  /**
   * Получить один абонемент
   */
  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            benefitCategory: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            studio: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subscriptionType: true,
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            issuedAt: true,
          },
        },
        attendances: {
          select: {
            id: true,
            status: true,
            notes: true,
            markedAt: true,
            markedByUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            subscriptionDeducted: true,
            subscription: {
              select: {
                id: true,
                remainingVisits: true,
                subscriptionType: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
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
          },
          orderBy: { markedAt: 'desc' },
          take: 6,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  /**
   * Обновить абонемент (только статус и остаток посещений)
   */
  async update(id: string, updateDto: UpdateSubscriptionDto) {
    await this.findOne(id);

    return this.prisma.subscription.update({
      where: { id },
      data: updateDto,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Валидация абонемента на дату
   */
  async validateSubscription(id: string, date: Date) {
    const subscription = await this.findOne(id);

    const isValid =
      subscription.status === 'ACTIVE' &&
      date >= subscription.startDate &&
      date <= subscription.endDate &&
      (subscription.remainingVisits === null ||
        subscription.remainingVisits > 0);

    return {
      isValid,
      subscription,
      message: isValid
        ? 'Subscription is valid'
        : 'Subscription is invalid or expired',
    };
  }

  /**
   * Продажа разового посещения по цене из настроек группы
   * Использует транзакцию для обеспечения целостности данных
   */
  async sellSingleSession(
    dto: {
      clientId: string;
      groupId: string;
      scheduleId: string;
      date?: string;
      notes?: string;
    },
    managerId?: string,
  ) {
    // 1. Получить группу с ценой разового посещения (вне транзакции - только чтение)
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: {
        studio: { select: { id: true, name: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    const singleSessionPrice = Number(group.singleSessionPrice);
    if (singleSessionPrice <= 0) {
      throw new BadRequestException('Цена разового посещения не установлена для данной группы');
    }

    // 2. Получить клиента (вне транзакции - только чтение)
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      include: { benefitCategory: true },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    // 3. Определить даты
    const today = this.startOfDay(new Date());
    const dateObj = dto.date ? new Date(dto.date) : today;
    const validMonth = this.formatValidMonth(dateObj);

    // 4. Выполнить все критические операции в транзакции
    const subscription = await this.prisma.$transaction(async (tx) => {
      // 4.1. Найти или создать тип подписки SINGLE_VISIT для группы
      let subscriptionType = await tx.subscriptionType.findFirst({
        where: {
          groupId: dto.groupId,
          type: 'SINGLE_VISIT',
          isActive: true,
        },
      });

      if (!subscriptionType) {
        subscriptionType = await tx.subscriptionType.create({
          data: {
            name: `Разовое посещение - ${group.name}`,
            type: 'SINGLE_VISIT',
            price: singleSessionPrice,
            groupId: dto.groupId,
            isActive: true,
          },
        });
      }

      // 4.2. Создать подписку
      const newSubscription = await tx.subscription.create({
        data: {
          clientId: dto.clientId,
          subscriptionTypeId: subscriptionType.id,
          groupId: dto.groupId,
          validMonth,
          purchaseDate: today,
          startDate: today,
          endDate: this.endOfDay(dateObj),
          originalPrice: singleSessionPrice,
          discountAmount: 0,
          paidPrice: singleSessionPrice,
          pricePerLesson: singleSessionPrice,
          remainingVisits: 1,
          purchasedMonths: 1,
          status: 'ACTIVE',
        },
      });

      // 4.3. Создать Invoice с InvoiceItem
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: dto.clientId,
          subscriptionId: newSubscription.id,
          subtotal: singleSessionPrice,
          discountAmount: 0,
          totalAmount: singleSessionPrice,
          status: 'PENDING',
          notes: dto.notes || `Разовое посещение группы "${group.name}"`,
          issuedAt: new Date(),
          createdBy: managerId,
          items: {
            create: {
              serviceType: ServiceType.SINGLE_SESSION,
              serviceName: `Разовое посещение - ${group.name}`,
              serviceDescription: `Занятие ${dateObj.toLocaleDateString('ru-RU')}`,
              quantity: 1,
              basePrice: singleSessionPrice,
              unitPrice: singleSessionPrice,
              vatRate: 0,
              vatAmount: 0,
              discountPercent: 0,
              totalPrice: singleSessionPrice,
              writeOffTiming: WriteOffTiming.ON_SALE,
            },
          },
        },
      });

      console.log(`✅ Sold single session for client ${dto.clientId} in group ${dto.groupId}`);

      // Вернуть подписку с нужными связями
      return tx.subscription.findUnique({
        where: { id: newSubscription.id },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              studio: {
                select: { id: true, name: true },
              },
            },
          },
          subscriptionType: true,
        },
      });
    });

    return subscription;
  }
}
