import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { SellSubscriptionDto } from './dto/sell-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';
import { ServiceType, WriteOffTiming, CalendarEventStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private invoicesService: InvoicesService,
  ) {}

  /**
   * Продажа абонемента с автоматическим созданием Invoice
   */
  async sellSubscription(sellDto: SellSubscriptionDto, managerId?: string) {
    // 1. Получить тип абонемента
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

    // 2. Получить клиента с льготной категорией
    const client = await this.prisma.client.findUnique({
      where: { id: sellDto.clientId },
      include: { benefitCategory: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // 3. Рассчитать даты и цены
    const purchaseDate = new Date();
    const { startDate, endDate } = this.calculateSubscriptionDates(
      sellDto.validMonth,
      purchaseDate,
    );

    const { originalPrice, discountAmount, finalPrice } =
      await this.calculateSubscriptionPrice(
        subscriptionType.price,
        purchaseDate,
        startDate,
        endDate,
        client.benefitCategory,
        sellDto.purchasedMonths || 1,
      );

    // 4. Проверить минимальный порог (для первого месяца)
    if (sellDto.purchasedMonths === 1) {
      await this.validateMinimumThreshold(
        sellDto.groupId,
        purchaseDate,
        endDate,
      );
    }

    // 5. Создать абонемент
    const subscription = await this.prisma.subscription.create({
      data: {
        clientId: sellDto.clientId,
        subscriptionTypeId: sellDto.subscriptionTypeId,
        groupId: sellDto.groupId,
        validMonth: sellDto.validMonth,
        purchaseDate,
        startDate,
        endDate,
        originalPrice: originalPrice,
        discountAmount: discountAmount,
        paidPrice: finalPrice,
        remainingVisits:
          subscriptionType.type === 'SINGLE_VISIT'
            ? this.calculateRemainingVisits(purchaseDate, endDate)
            : null,
        purchasedMonths: sellDto.purchasedMonths || 1,
        status: 'ACTIVE',
      },
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

    // 6. Создать Invoice с InvoiceItem
    try {
      const invoice = await this.invoicesService.create(
        {
          clientId: sellDto.clientId,
          subscriptionId: subscription.id,
          items: [
            {
              serviceType: ServiceType.SUBSCRIPTION,
              serviceName: `Абонемент "${subscriptionType.name}" - ${subscriptionType.group.name}`,
              serviceDescription: `Период: ${sellDto.validMonth} (${sellDto.purchasedMonths} мес.)`,
              quantity: sellDto.purchasedMonths || 1,
              basePrice: Number(subscriptionType.price),
              unitPrice: Number(finalPrice / (sellDto.purchasedMonths || 1)),
              vatRate: 0, // Абонементы без НДС
              discountPercent: client.benefitCategory
                ? Number(client.benefitCategory.discountPercent)
                : 0,
              writeOffTiming: WriteOffTiming.ON_USE,
            },
          ],
          notes: sellDto.notes,
        },
        managerId,
      );

      console.log(
        `✅ Created subscription ${subscription.id} with invoice ${invoice.id}`,
      );
    } catch (error) {
      console.error('Failed to create invoice for subscription:', error);
      // Не удаляем абонемент если счет не создался - можно создать вручную
    }

    return subscription;
  }

  /**
   * Рассчитать даты абонемента (startDate, endDate)
   */
  private calculateSubscriptionDates(
    validMonth: string,
    purchaseDate: Date,
  ): { startDate: Date; endDate: Date } {
    const [year, month] = validMonth.split('-').map(Number);

    // Дата начала = дата покупки (или 1-е число месяца, если покупают заранее)
    const startDate = new Date(purchaseDate);

    // Дата окончания = последний день месяца validMonth
    const endDate = new Date(year, month, 0); // 0 = последний день предыдущего месяца

    return { startDate, endDate };
  }

  /**
   * Рассчитать цену абонемента с пропорциональной скидкой и льготами
   */
  private async calculateSubscriptionPrice(
    basePrice: number | any,
    purchaseDate: Date,
    startDate: Date,
    endDate: Date,
    benefitCategory: any,
    purchasedMonths: number,
  ): Promise<{
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
  }> {
    const basePriceNum = Number(basePrice);

    // Рассчитать пропорциональную цену для первого месяца
    const daysInMonth = endDate.getDate();
    const remainingDays = Math.ceil(
      (endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

    let proportionalPrice = basePriceNum;
    if (remainingDays < daysInMonth) {
      proportionalPrice = (basePriceNum / daysInMonth) * remainingDays;
    }

    // Цена за все месяцы (первый пропорционально, остальные полностью)
    const totalPrice =
      proportionalPrice + basePriceNum * (purchasedMonths - 1);

    // Применить льготную категорию
    let discountAmount = 0;
    if (benefitCategory && benefitCategory.isActive) {
      const discountPercent = Number(benefitCategory.discountPercent);
      discountAmount = (totalPrice * discountPercent) / 100;
    }

    const finalPrice = totalPrice - discountAmount;

    return {
      originalPrice: totalPrice,
      discountAmount,
      finalPrice,
    };
  }

  /**
   * Проверить минимальный порог занятий (≥3 занятия до конца месяца)
   */
  private async validateMinimumThreshold(
    groupId: string,
    purchaseDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Получить расписание группы на оставшиеся дни месяца
    const schedules = await this.prisma.schedule.count({
      where: {
        groupId,
        date: {
          gte: purchaseDate,
          lte: endDate,
        },
        status: CalendarEventStatus.PLANNED,
      },
    });

    if (schedules < 3) {
      throw new BadRequestException(
        `Недостаточно занятий до конца месяца (осталось ${schedules}, минимум 3). Купите абонемент на следующий месяц.`,
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

  /**
   * Получить список абонементов с фильтрацией
   */
  async findAll(filter: SubscriptionFilterDto = {}) {
    const { clientId, groupId, status, validMonth, page = 1, limit = 50 } =
      filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (groupId) where.groupId = groupId;
    if (status) where.status = status;
    if (validMonth) where.validMonth = validMonth;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
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
}
