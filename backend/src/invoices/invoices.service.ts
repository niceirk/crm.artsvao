import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { QRGeneratorService } from './qr/qr-generator.service';
import { QRPaymentDataBuilder, BudgetPaymentData } from './qr/qr-payment-data.builder';
import { updateWithVersionCheck } from '../common/utils/optimistic-lock.util';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qrGenerator: QRGeneratorService,
  ) {}

  /**
   * Генерация уникального номера счета
   * Формат: МР-ГГ-NNNNNN (МР-год-порядковый номер)
   */
  public async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2); // "25"
    const prefix = `МР-${year}`;

    // Находим последний счёт за этот год
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Расчет сумм счета
   */
  private calculateTotals(items: CreateInvoiceDto['items'], discountAmount: number = 0) {
    let subtotal = 0;

    const processedItems = items.map((item) => {
      const vatAmount = item.basePrice * (item.vatRate / 100) * item.quantity;
      const itemDiscountAmount = item.discountPercent
        ? (item.basePrice * item.quantity * (item.discountPercent / 100))
        : 0;

      const totalPrice = (item.basePrice * item.quantity) + vatAmount - itemDiscountAmount;

      subtotal += item.basePrice * item.quantity;

      return {
        ...item,
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),
        totalPrice: parseFloat(totalPrice.toFixed(2)),
      };
    });

    const totalAmount = subtotal + processedItems.reduce((sum, item) => sum + item.vatAmount, 0) - discountAmount;

    return {
      processedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  }

  async create(dto: CreateInvoiceDto, userId: string) {
    // Проверка существования клиента
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      include: { benefitCategory: true },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    // Генерация номера счета
    const invoiceNumber = await this.generateInvoiceNumber();

    // Расчет сумм
    const { processedItems, subtotal, totalAmount } = this.calculateTotals(
      dto.items,
      dto.discountAmount || 0,
    );

    // Проверяем какие serviceId существуют в таблице Service
    const serviceIds = processedItems
      .map((item) => item.serviceId)
      .filter((id): id is string => !!id && !id.startsWith('single-'));

    const existingServices = serviceIds.length > 0
      ? await this.prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true },
        })
      : [];

    const validServiceIds = new Set(existingServices.map((s) => s.id));

    // Создание счета с позициями
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: dto.clientId,
        subscriptionId: dto.subscriptionId,
        rentalId: dto.rentalId,
        rentalApplicationId: dto.rentalApplicationId,
        subtotal,
        discountAmount: dto.discountAmount || 0,
        totalAmount,
        dueDate: dto.dueDate,
        notes: dto.notes,
        createdBy: userId,
        status: InvoiceStatus.PENDING,
        items: {
          create: processedItems.map((item) => ({
            // serviceId только если он существует в таблице Service
            serviceId: item.serviceId && validServiceIds.has(item.serviceId) ? item.serviceId : null,
            // groupId извлекаем из serviceId для разовых посещений (формат: single-{groupId})
            groupId: item.groupId || (item.serviceId?.startsWith('single-') ? item.serviceId.replace('single-', '') : null),
            serviceType: item.serviceType,
            serviceName: item.serviceName,
            serviceDescription: item.serviceDescription,
            roomId: item.roomId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            basePrice: item.basePrice,
            vatRate: item.vatRate,
            vatAmount: item.vatAmount,
            discountPercent: item.discountPercent || 0,
            discountAmount: item.discountAmount,
            totalPrice: item.totalPrice,
            writeOffTiming: item.writeOffTiming,
            isPriceAdjusted: item.isPriceAdjusted || false,
            adjustmentReason: item.adjustmentReason,
          })),
        },
        ...(userId && {
          auditLogs: {
            create: {
              action: 'CREATED',
              fieldName: 'invoice',
              newValue: invoiceNumber,
              userId,
            },
          },
        }),
      },
      include: {
        items: true,
        client: {
          include: {
            benefitCategory: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return invoice;
  }

  async findAll(filter?: InvoiceFilterDto) {
    const where: Prisma.InvoiceWhereInput = {};

    if (filter) {
      if (filter.clientId) {
        where.clientId = filter.clientId;
      }
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.invoiceNumber) {
        where.invoiceNumber = {
          contains: filter.invoiceNumber,
          mode: 'insensitive',
        };
      }
      if (filter.issuedAfter || filter.issuedBefore) {
        where.issuedAt = {};
        if (filter.issuedAfter) {
          where.issuedAt.gte = new Date(filter.issuedAfter);
        }
        if (filter.issuedBefore) {
          where.issuedAt.lte = new Date(filter.issuedBefore);
        }
      }
    }

    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          items: {
            select: {
              id: true,
              serviceName: true,
              quantity: true,
              totalPrice: true,
            },
          },
          _count: {
            select: {
              payments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
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
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            benefitCategory: true,
          },
        },
        items: {
          include: {
            service: true,
            room: true,
          },
        },
        payments: true,
        rental: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        auditLogs: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, userId: string) {
    const invoice = await this.findOne(id);

    // Проверяем переход статуса на PAID
    const isBecomingPaid = dto.status === InvoiceStatus.PAID && invoice.status !== InvoiceStatus.PAID;

    // Извлекаем version для проверки
    const { version, ...restDto } = dto;

    // Создание audit log для каждого изменения
    const auditLogs: Prisma.InvoiceAuditLogCreateManyInvoiceInput[] = [];

    if (userId && dto.status && dto.status !== invoice.status) {
      auditLogs.push({
        action: 'STATUS_CHANGED',
        fieldName: 'status',
        oldValue: invoice.status,
        newValue: dto.status,
        userId,
      });
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      ...restDto,
      paidAt: isBecomingPaid ? new Date() : restDto.paidAt,
    };

    const include = {
      items: {
        include: {
          group: true,
        },
      },
      client: true,
      creator: true,
    };

    // Используем условную проверку версии (только если version передан)
    let updated;
    if (version !== undefined) {
      updated = await updateWithVersionCheck(
        this.prisma,
        'invoice',
        id,
        version,
        updateData,
        include,
      );
    } else {
      updated = await this.prisma.invoice.update({
        where: { id },
        data: updateData,
        include,
      });
    }

    // Создаём аудит-лог отдельно если есть изменения
    if (auditLogs.length > 0) {
      await this.prisma.invoiceAuditLog.createMany({
        data: auditLogs.map(log => ({
          ...log,
          invoiceId: id,
        })),
      });
    }

    // При оплате счёта создаём подписки для позиций с groupId
    if (isBecomingPaid) {
      await this.createSubscriptionsFromInvoice(updated);
    }

    return updated;
  }

  /**
   * Создание подписок из оплаченного счёта
   */
  private async createSubscriptionsFromInvoice(invoice: any) {
    const now = new Date();
    // Создаем UTC дату, чтобы избежать смещения часовых поясов
    const today = new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0, 0
    ));

    const validMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    for (const item of invoice.items) {
      // Только для позиций с groupId и типом SINGLE_SESSION или SUBSCRIPTION
      if (!item.groupId) continue;
      if (item.serviceType !== 'SINGLE_SESSION' && item.serviceType !== 'SUBSCRIPTION') continue;

      const group = item.group || await this.prisma.group.findUnique({ where: { id: item.groupId } });
      if (!group) continue;

      // Находим или создаём тип подписки
      let subscriptionType = await this.prisma.subscriptionType.findFirst({
        where: {
          groupId: item.groupId,
          type: item.serviceType === 'SINGLE_SESSION' ? 'VISIT_PACK' : 'UNLIMITED',
          isActive: true,
        },
      });

      if (!subscriptionType) {
        subscriptionType = await this.prisma.subscriptionType.create({
          data: {
            name: item.serviceName,
            type: item.serviceType === 'SINGLE_SESSION' ? 'VISIT_PACK' : 'UNLIMITED',
            price: Number(item.totalPrice),
            groupId: item.groupId,
            isActive: true,
          },
        });
      }

      // Создаём подписку для каждой единицы quantity
      const quantity = Number(item.quantity);
      for (let i = 0; i < quantity; i++) {
        await this.prisma.subscription.create({
          data: {
            clientId: invoice.clientId,
            subscriptionTypeId: subscriptionType.id,
            groupId: item.groupId,
            validMonth,
            purchaseDate: today,
            startDate: today,
            endDate: item.serviceType === 'SINGLE_SESSION' ? endOfMonth : endOfMonth,
            originalPrice: Number(item.basePrice),
            discountAmount: Number(item.discountAmount) / quantity,
            paidPrice: Number(item.totalPrice) / quantity,
            vatRate: Number(item.vatRate),
            vatAmount: Number(item.vatAmount) / quantity,
            remainingVisits: item.serviceType === 'SINGLE_SESSION' ? 1 : null,
            totalVisits: item.serviceType === 'SINGLE_SESSION' ? 1 : null,
            purchasedMonths: 1,
            status: 'ACTIVE',
          },
        });
      }

      this.logger.log(`✅ Создана подписка для клиента ${invoice.clientId} из счёта ${invoice.invoiceNumber}: ${item.serviceName}`);
    }
  }

  async delete(id: string, userEmail?: string) {
    const invoice = await this.findOne(id);

    // Суперадмин (nikita@artsvao.ru) может удалять счета в любом статусе
    const isSuperAdmin = userEmail === 'nikita@artsvao.ru';

    // Проверка: нельзя удалить оплаченный счет (кроме суперадмина)
    if (!isSuperAdmin && (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIALLY_PAID)) {
      throw new ConflictException('Cannot delete paid or partially paid invoice');
    }

    return this.prisma.invoice.delete({
      where: { id },
    });
  }

  /**
   * Быстрая отметка счета как оплаченного
   */
  async markAsPaid(id: string, userId: string) {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Счет уже оплачен');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Нельзя оплатить отмененный счет');
    }

    return this.update(id, {
      status: InvoiceStatus.PAID,
      paidAt: new Date().toISOString(),
    }, userId);
  }

  /**
   * Получить счета клиента
   */
  async findByClient(clientId: string, limit: number = 10) {
    return this.prisma.invoice.findMany({
      where: { clientId },
      include: {
        items: {
          select: {
            id: true,
            serviceName: true,
            quantity: true,
            totalPrice: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Получить реквизиты организации для QR-кода
   * @returns Реквизиты организации
   */
  async getOrganizationDetails() {
    const details = await this.prisma.organizationDetails.findFirst({
      where: { isPrimary: true },
    });

    if (!details) {
      throw new NotFoundException(
        'Реквизиты организации не найдены. Необходимо заполнить данные через seed.',
      );
    }

    return details;
  }

  /**
   * Генерация QR-кода для оплаты счета
   * @param invoiceId - ID счета
   * @returns Buffer с PNG изображением и Data URL
   */
  async generateQRCode(invoiceId: string): Promise<{
    buffer: Buffer;
    dataUrl: string;
    paymentData: BudgetPaymentData;
    paymentString: string;
  }> {
    // Получаем счет с полной информацией
    const invoice = await this.findOne(invoiceId);

    if (!invoice.client) {
      throw new NotFoundException('Клиент счета не найден');
    }

    // Получаем реквизиты организации
    const orgDetails = await this.getOrganizationDetails();

    // Формируем назначение платежа
    const serviceNames = invoice.items
      .map((item) => item.serviceName)
      .join(', ');

    // Формируем ФИО клиента для назначения платежа
    const clientFullName = `${invoice.client.lastName} ${invoice.client.firstName}${invoice.client.middleName ? ' ' + invoice.client.middleName : ''}`;

    const purpose = `Оплата по счету №${invoice.invoiceNumber} от ${invoice.issuedAt.toLocaleDateString('ru-RU')}. ${serviceNames}. ФИО плательщика: ${clientFullName}`;

    // Формируем название получателя с ИНН и КПП, убираем ВСЕ кавычки
    const cleanOrgName = orgDetails.organizationName
      .replace(/["'«»„"'"]/g, '')  // Убираем все виды кавычек
      .replace(/\s+/g, ' ')         // Убираем множественные пробелы
      .trim();                       // Убираем пробелы по краям

    const fullName = `ИНН ${orgDetails.inn} КПП ${orgDetails.kpp} ${cleanOrgName}`;
    const trimmedName = fullName.length > 160
      ? fullName.substring(0, 160)
      : fullName;

    // Формируем данные для QR-кода
    const paymentData: BudgetPaymentData = {
      // Получатель - с ИНН и КПП, без кавычек
      Name: trimmedName,
      PayeeINN: orgDetails.inn,
      KPP: orgDetails.kpp,
      PersonalAcc: orgDetails.treasuryAccount,

      // Банк
      BankName: orgDetails.bankName,
      BIC: orgDetails.bic,
      CorrespAcc: orgDetails.correspAcc,

      // Бюджетные коды
      CBC: orgDetails.defaultKBK,
      OKTMO: orgDetails.defaultOKTMO,

      // Платеж - сумма в рублях с копейками (формат: xxxx.xx)
      // ВАЖНО: Преобразуем Decimal в число с правильной точностью для совместимости со Сбербанком
      Purpose: purpose,
      Sum: parseFloat(invoice.totalAmount.toString()),

      // Плательщик - данные из счета
      LastName: invoice.client.lastName,
      FirstName: invoice.client.firstName,
      MiddleName: invoice.client.middleName || undefined,

      // Дополнительные данные
      DrawerStatus: '0', // Физическое лицо
      DocNo: invoice.invoiceNumber,
      DocDate: QRPaymentDataBuilder.formatDocDate(invoice.issuedAt),
    };

    // Формируем строку платежных данных по ГОСТ
    const paymentString = QRPaymentDataBuilder.buildBudgetPaymentString(paymentData);

    // Генерируем QR-код
    const { buffer, dataUrl } = await this.qrGenerator.generateBoth(paymentString, {
      errorCorrectionLevel: 'M',
      width: 400,
    });

    return {
      buffer,
      dataUrl,
      paymentData,
      paymentString,
    };
  }
}
