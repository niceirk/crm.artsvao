import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GroupsService } from '../groups/groups.service';
import { SellSubscriptionDto } from './dto/sell-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';
import { VatHelper } from './vat.helper';
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
    // 1. Получить тип абонемента с группой и категорией для НДС (вне транзакции - только чтение)
    const subscriptionType = await this.prisma.subscriptionType.findUnique({
      where: { id: sellDto.subscriptionTypeId },
      include: {
        group: {
          include: {
            serviceCategory: true,
          },
        },
      },
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
        typePricePerLesson: subscriptionType.pricePerLesson,
        benefitCategory: client.benefitCategory,
        purchasedMonths: sellDto.purchasedMonths || 1,
        applyBenefit,
        lessonStats,
      });

    // 3.5. Рассчитать НДС
    const categoryVatRate = subscriptionType.group.serviceCategory?.defaultVatRate ?? 0;
    const overrideVatRate = subscriptionType.vatRate;
    const vatData = VatHelper.calculateForSale({
      clientBirthDate: client.dateOfBirth,
      totalPrice: finalPrice,
      categoryVatRate: Number(categoryVatRate),
      overrideVatRate: overrideVatRate !== null ? Number(overrideVatRate) : undefined,
      vatIncluded: subscriptionType.vatIncluded ?? true,
    });

    console.log(`💰 НДС расчёт: ставка ${vatData.effectiveVatRate}%, сумма ${vatData.vatAmount} ₽${vatData.isChildDiscount ? ' (детская скидка)' : ''}`);

    // 4. Проверить минимальный порог (для первого месяца)
    if (sellDto.purchasedMonths === 1) {
      this.validateMinimumThreshold(lessonStats.remainingPlanned);
    }

    // 5. Выполнить все критические операции в транзакции
    const subscription = await this.prisma.$transaction(async (tx) => {
      // 5.1. Создать абонемент с НДС
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
          vatRate: vatData.effectiveVatRate,
          vatAmount: vatData.vatAmount,
          remainingVisits:
            subscriptionType.type === 'VISIT_PACK'
              ? this.calculateRemainingVisits(purchaseDate, endDate)
              : null,
          purchasedMonths: sellDto.purchasedMonths || 1,
          status: 'ACTIVE',
        },
      });

      // 5.2. Добавить клиента в группу или восстановить/переместить из WAITLIST
      // При покупке абонемента всегда зачисляем как ACTIVE, игнорируя лимит группы
      const existingMember = await tx.groupMember.findUnique({
        where: {
          groupId_clientId: {
            groupId: sellDto.groupId,
            clientId: sellDto.clientId,
          },
        },
      });

      if (!existingMember) {
        // Создать нового участника как ACTIVE
        await tx.groupMember.create({
          data: {
            groupId: sellDto.groupId,
            clientId: sellDto.clientId,
            status: 'ACTIVE',
            waitlistPosition: null,
          },
        });
        console.log(`✅ Client ${sellDto.clientId} automatically added to group ${sellDto.groupId}`);
      } else if (existingMember.status === 'EXPELLED') {
        // Восстановить отчисленного клиента как ACTIVE
        await tx.groupMember.update({
          where: { id: existingMember.id },
          data: {
            status: 'ACTIVE',
            waitlistPosition: null,
            leftAt: null,
          },
        });
        console.log(`✅ Client ${sellDto.clientId} restored from EXPELLED to ACTIVE in group ${sellDto.groupId}`);
      } else if (existingMember.status === 'WAITLIST') {
        // Переместить из листа ожидания в ACTIVE (купил абонемент = гарантированное место)
        await tx.groupMember.update({
          where: { id: existingMember.id },
          data: {
            status: 'ACTIVE',
            waitlistPosition: null,
          },
        });
        console.log(`✅ Client ${sellDto.clientId} moved from WAITLIST to ACTIVE in group ${sellDto.groupId}`);
      }
      // Если уже ACTIVE - ничего не делаем

      // 5.3. Создать Invoice с InvoiceItem
      const invoiceNumber = await this.invoicesService.generateInvoiceNumber();
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
              vatRate: vatData.effectiveVatRate,
              vatAmount: vatData.vatAmount,
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
   *
   * Логика:
   * - Полный месяц (remainingPlanned === totalPlanned) → полная стоимость (basePrice)
   * - Неполный месяц → typePricePerLesson × remainingPlanned (или fallback к floor)
   */
  private calculateSubscriptionPrice({
    basePrice,
    typePricePerLesson,
    benefitCategory,
    purchasedMonths,
    applyBenefit,
    lessonStats,
  }: {
    basePrice: Prisma.Decimal | number;
    typePricePerLesson?: Prisma.Decimal | number | null;
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

    // Определяем цену за занятие: из типа абонемента или fallback
    const pricePerLesson = typePricePerLesson
      ? Number(typePricePerLesson)
      : Math.floor(basePriceNum / totalPlanned);

    // Рассчитываем стоимость первого месяца
    let firstMonthPrice: number;
    if (remainingPlanned === totalPlanned) {
      // Полный месяц → полная стоимость
      firstMonthPrice = basePriceNum;
    } else {
      // Неполный месяц → пропорционально
      firstMonthPrice = pricePerLesson * remainingPlanned;
    }

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
    // Создаем UTC дату, чтобы избежать смещения часовых поясов
    return new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));
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
              phone: true,
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
   * Продажа разового посещения (1 или более) по цене из настроек группы
   * - quantity=1 + scheduleId → привязка к конкретному занятию, endDate = дата занятия
   * - quantity>=1 без scheduleId → бессрочный (endDate +10 лет), применяется льгота
   */
  async sellSingleSession(
    dto: {
      clientId: string;
      groupId: string;
      scheduleId?: string;
      quantity?: number;
      date?: string;
      notes?: string;
      applyBenefit?: boolean;
    },
    managerId?: string,
  ) {
    const quantity = dto.quantity ?? 1;
    const isSingleFromJournal = dto.scheduleId && quantity === 1;

    // 1. Получить группу с ценой разового посещения и категорией для НДС
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: {
        studio: { select: { id: true, name: true } },
        serviceCategory: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    const singleSessionPrice = Number(group.singleSessionPrice);
    if (singleSessionPrice <= 0) {
      throw new BadRequestException('Цена разового посещения не установлена для данной группы');
    }

    // 2. Получить клиента с льготной категорией
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

    // Определить endDate: привязка к занятию или бессрочный
    let endDate: Date;
    if (isSingleFromJournal) {
      endDate = dateObj; // endDate = дата занятия
    } else {
      // Бессрочный - endDate через 10 лет
      endDate = new Date(today);
      endDate.setFullYear(endDate.getFullYear() + 10);
    }

    // 4. Рассчитать цену с учётом quantity (без льготы для разовых)
    const totalPrice = singleSessionPrice * quantity;
    // Льготы НЕ применяются к разовым занятиям
    const applyBenefit = false;

    let discountAmount = 0;
    let discountPercent = 0;
    if (applyBenefit && client.benefitCategory?.isActive) {
      discountPercent = Number(client.benefitCategory.discountPercent);
      discountAmount = (totalPrice * discountPercent) / 100;
    }
    const finalPrice = this.toMoney(totalPrice - discountAmount);

    // 5. Рассчитать НДС
    const categoryVatRate = group.serviceCategory?.defaultVatRate ?? 0;
    const overrideVatRate = group.singleSessionVatRate;
    const vatData = VatHelper.calculateForSale({
      clientBirthDate: client.dateOfBirth,
      totalPrice: finalPrice,
      categoryVatRate: Number(categoryVatRate),
      overrideVatRate: overrideVatRate !== null ? Number(overrideVatRate) : undefined,
      vatIncluded: true,
    });

    console.log(`💰 НДС разовое (${quantity} шт): ставка ${vatData.effectiveVatRate}%, сумма ${vatData.vatAmount} ₽${vatData.isChildDiscount ? ' (детская скидка)' : ''}`);

    // 6. Выполнить все критические операции в транзакции
    const subscription = await this.prisma.$transaction(async (tx) => {
      // 6.1. Найти или создать тип подписки VISIT_PACK для группы
      let subscriptionType = await tx.subscriptionType.findFirst({
        where: {
          groupId: dto.groupId,
          type: 'VISIT_PACK',
          isActive: true,
        },
      });

      if (!subscriptionType) {
        subscriptionType = await tx.subscriptionType.create({
          data: {
            name: `Разовое посещение - ${group.name}`,
            type: 'VISIT_PACK',
            price: singleSessionPrice,
            groupId: dto.groupId,
            isActive: true,
          },
        });
      }

      // 6.2. Создать подписку
      const newSubscription = await tx.subscription.create({
        data: {
          clientId: dto.clientId,
          subscriptionTypeId: subscriptionType.id,
          groupId: dto.groupId,
          validMonth,
          purchaseDate: today,
          startDate: today,
          endDate: this.endOfDay(endDate),
          originalPrice: totalPrice,
          discountAmount: this.toMoney(discountAmount),
          paidPrice: finalPrice,
          pricePerLesson: singleSessionPrice,
          vatRate: vatData.effectiveVatRate,
          vatAmount: vatData.vatAmount,
          remainingVisits: quantity,
          totalVisits: quantity,
          purchasedMonths: 1,
          status: 'ACTIVE',
        },
      });

      // 6.2.5. Добавить клиента в группу или восстановить/переместить из WAITLIST
      // При покупке разового посещения всегда зачисляем как ACTIVE, игнорируя лимит группы
      const existingMember = await tx.groupMember.findUnique({
        where: {
          groupId_clientId: {
            groupId: dto.groupId,
            clientId: dto.clientId,
          },
        },
      });

      if (!existingMember) {
        // Создать нового участника как ACTIVE
        await tx.groupMember.create({
          data: {
            groupId: dto.groupId,
            clientId: dto.clientId,
            status: 'ACTIVE',
            waitlistPosition: null,
          },
        });
        console.log(`✅ Client ${dto.clientId} automatically added to group ${dto.groupId}`);
      } else if (existingMember.status === 'EXPELLED') {
        // Восстановить отчисленного клиента как ACTIVE
        await tx.groupMember.update({
          where: { id: existingMember.id },
          data: {
            status: 'ACTIVE',
            waitlistPosition: null,
            leftAt: null,
          },
        });
        console.log(`✅ Client ${dto.clientId} restored from EXPELLED to ACTIVE in group ${dto.groupId}`);
      } else if (existingMember.status === 'WAITLIST') {
        // Переместить из листа ожидания в ACTIVE (купил абонемент = гарантированное место)
        await tx.groupMember.update({
          where: { id: existingMember.id },
          data: {
            status: 'ACTIVE',
            waitlistPosition: null,
          },
        });
        console.log(`✅ Client ${dto.clientId} moved from WAITLIST to ACTIVE in group ${dto.groupId}`);
      }
      // Если уже ACTIVE - ничего не делаем

      // 6.3. Создать Invoice с InvoiceItem
      const invoiceNumber = await this.invoicesService.generateInvoiceNumber();
      const serviceName = quantity === 1
        ? `Разовое посещение - ${group.name}`
        : `Разовые посещения (${quantity} шт.) - ${group.name}`;
      const serviceDescription = isSingleFromJournal
        ? `Занятие ${dateObj.toLocaleDateString('ru-RU')}`
        : `${quantity} занятий, бессрочный`;

      await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: dto.clientId,
          subscriptionId: newSubscription.id,
          subtotal: totalPrice,
          discountAmount: this.toMoney(discountAmount),
          totalAmount: finalPrice,
          status: 'PENDING',
          notes: dto.notes || serviceName,
          issuedAt: new Date(),
          createdBy: managerId,
          items: {
            create: {
              serviceType: ServiceType.SINGLE_SESSION,
              serviceName,
              serviceDescription,
              quantity,
              basePrice: singleSessionPrice,
              unitPrice: singleSessionPrice,
              vatRate: vatData.effectiveVatRate,
              vatAmount: vatData.vatAmount,
              discountPercent,
              discountAmount: this.toMoney(discountAmount),
              totalPrice: finalPrice,
              // ON_SALE для одиночного из журнала, ON_USE для множественных
              writeOffTiming: isSingleFromJournal ? WriteOffTiming.ON_SALE : WriteOffTiming.ON_USE,
              remainingQuantity: isSingleFromJournal ? undefined : quantity,
            },
          },
        },
      });

      console.log(`✅ Sold ${quantity} single session(s) for client ${dto.clientId} in group ${dto.groupId}`);

      // Вернуть подписку с нужными связями
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
              studio: { select: { id: true, name: true } },
            },
          },
          subscriptionType: true,
        },
      });
    });

    return subscription;
  }

  /**
   * Продажа независимой услуги (копирование, печать и т.д.)
   * Создаёт ServiceSale и Invoice
   */
  async sellIndependentService(
    dto: {
      clientId: string;
      serviceId: string;
      quantity?: number;
      notes?: string;
    },
    managerId?: string,
  ) {
    // 1. Получить услугу
    const service = await this.prisma.independentService.findUnique({
      where: { id: dto.serviceId },
      include: { category: true },
    });

    if (!service) {
      throw new NotFoundException('Услуга не найдена');
    }

    if (!service.isActive) {
      throw new BadRequestException('Услуга неактивна');
    }

    // 2. Получить клиента
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    // 3. Рассчитать цену
    const quantity = dto.quantity || 1;
    const unitPrice = Number(service.price);
    const totalPrice = this.toMoney(unitPrice * quantity);

    // 4. Рассчитать НДС
    const vatRate = Number(service.vatRate);
    const vatAmount = vatRate > 0 ? this.toMoney(totalPrice * vatRate / (100 + vatRate)) : 0;

    console.log(`💰 Продажа услуги: ${service.name}, кол-во: ${quantity}, сумма: ${totalPrice} ₽, НДС ${vatRate}%: ${vatAmount} ₽`);

    // 5. Выполнить операции в транзакции
    const result = await this.prisma.$transaction(async (tx) => {
      // 5.1. Создать запись о продаже услуги
      const serviceSale = await tx.serviceSale.create({
        data: {
          clientId: dto.clientId,
          serviceId: dto.serviceId,
          quantity,
          originalPrice: totalPrice,
          paidPrice: totalPrice,
          vatRate,
          vatAmount,
          notes: dto.notes,
          purchaseDate: new Date(),
          managerId,
        },
      });

      // 5.2. Создать Invoice
      const invoiceNumber = await this.invoicesService.generateInvoiceNumber();
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: dto.clientId,
          subtotal: totalPrice,
          discountAmount: 0,
          totalAmount: totalPrice,
          status: 'PENDING',
          notes: dto.notes || `Услуга: ${service.name}`,
          issuedAt: new Date(),
          createdBy: managerId,
          items: {
            create: {
              serviceType: ServiceType.OTHER,
              serviceName: service.name,
              serviceDescription: service.description || '',
              quantity,
              basePrice: unitPrice,
              unitPrice: unitPrice,
              vatRate,
              vatAmount,
              discountPercent: 0,
              totalPrice,
              writeOffTiming: WriteOffTiming.ON_SALE,
            },
          },
        },
      });

      console.log(`✅ Продана услуга ${service.name} клиенту ${dto.clientId}, invoice ${invoice.id}`);

      // Вернуть запись продажи с нужными связями
      return tx.serviceSale.findUnique({
        where: { id: serviceSale.id },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              price: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    return result;
  }

  /**
   * Проверить возможность удаления абонемента
   * Блокируется если:
   * - Счёт оплачен (PAID) или частично оплачен (PARTIALLY_PAID)
   * - Есть компенсации по медицинской справке
   */
  async canDelete(id: string): Promise<{
    canDelete: boolean;
    reason?: string;
    attendanceCount: number;
  }> {
    // Проверяем существование абонемента
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    // Проверка 1: Оплаченные или частично оплаченные счета (используем COUNT вместо загрузки всех данных)
    const paidInvoiceCount = await this.prisma.invoice.count({
      where: {
        subscriptionId: id,
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
      },
    });

    if (paidInvoiceCount > 0) {
      return {
        canDelete: false,
        reason: 'Невозможно удалить абонемент с оплаченным или частично оплаченным счётом',
        attendanceCount: 0,
      };
    }

    // Проверка 2: Компенсации по медицинской справке
    const compensationCount = await this.prisma.medicalCertificateSchedule.count({
      where: {
        subscriptionId: id,
        compensationAmount: { gt: 0 },
      },
    });

    if (compensationCount > 0) {
      return {
        canDelete: false,
        reason: 'Невозможно удалить абонемент с компенсациями по медицинской справке',
        attendanceCount: 0,
      };
    }

    // Подсчитываем количество посещений
    const attendanceCount = await this.prisma.attendance.count({
      where: { subscriptionId: id },
    });

    return {
      canDelete: true,
      attendanceCount,
    };
  }

  /**
   * Удалить абонемент
   * При удалении:
   * - Удаляются записи посещений (Attendance)
   * - Счета переводятся в статус CANCELLED
   * - Связи с MedicalCertificateSchedule обнуляются
   */
  async remove(id: string): Promise<{ deleted: boolean; attendanceDeleted: number }> {
    const canDeleteResult = await this.canDelete(id);

    if (!canDeleteResult.canDelete) {
      throw new BadRequestException(canDeleteResult.reason);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Удалить все записи посещений
      const deletedAttendances = await tx.attendance.deleteMany({
        where: { subscriptionId: id },
      });

      // 2. Изменить статус счетов на CANCELLED
      await tx.invoice.updateMany({
        where: { subscriptionId: id },
        data: { status: 'CANCELLED' },
      });

      // 3. Удалить связи с MedicalCertificateSchedule (обнулить subscriptionId)
      await tx.medicalCertificateSchedule.updateMany({
        where: { subscriptionId: id },
        data: { subscriptionId: null },
      });

      // 4. Удалить абонемент
      await tx.subscription.delete({
        where: { id },
      });

      console.log(`🗑️ Удалён абонемент ${id}, удалено ${deletedAttendances.count} записей посещений`);

      return {
        deleted: true,
        attendanceDeleted: deletedAttendances.count,
      };
    });
  }
}
