import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { InvoiceStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Генерация уникального номера счета
   * Формат: INV-YYYYMMDD-XXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const datePrefix = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

    // Находим последний счет за сегодня
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: `INV-${datePrefix}`,
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

    return `INV-${datePrefix}-${sequence.toString().padStart(4, '0')}`;
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

    // Создание счета с позициями
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: dto.clientId,
        subscriptionId: dto.subscriptionId,
        rentalId: dto.rentalId,
        subtotal,
        discountAmount: dto.discountAmount || 0,
        totalAmount,
        dueDate: dto.dueDate,
        notes: dto.notes,
        createdBy: userId,
        status: InvoiceStatus.PENDING,
        items: {
          create: processedItems.map((item) => ({
            serviceId: item.serviceId,
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

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...dto,
        auditLogs: auditLogs.length > 0 ? {
          createMany: {
            data: auditLogs,
          },
        } : undefined,
      },
      include: {
        items: true,
        client: true,
        creator: true,
      },
    });

    return updated;
  }

  async delete(id: string) {
    const invoice = await this.findOne(id);

    // Проверка: нельзя удалить оплаченный счет
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIALLY_PAID) {
      throw new ConflictException('Cannot delete paid or partially paid invoice');
    }

    return this.prisma.invoice.delete({
      where: { id },
    });
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
}
