import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientActivityService } from '../clients/client-activity.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientActivityService: ClientActivityService,
  ) {}

  /**
   * Расчет общей суммы оплаченных платежей для счета
   */
  private async calculateTotalPaid(invoiceId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: {
        invoiceId,
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }

  /**
   * Обновление статуса счета на основе платежей
   */
  private async updateInvoiceStatus(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    const totalPaid = await this.calculateTotalPaid(invoiceId);
    const totalAmount = Number(invoice.totalAmount);

    let newStatus: InvoiceStatus;
    let paidAt: Date | null = null;

    if (totalPaid >= totalAmount) {
      newStatus = InvoiceStatus.PAID;
      paidAt = new Date();
    } else if (totalPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID;
    } else {
      newStatus = InvoiceStatus.PENDING;
    }

    // Обновляем статус счета только если он изменился
    if (invoice.status !== newStatus) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: newStatus,
          paidAt: newStatus === InvoiceStatus.PAID ? paidAt : null,
        },
      });
    }
  }

  /**
   * Расчет общей суммы оплаченных платежей для счета (для транзакции)
   */
  private async calculateTotalPaidInTx(
    tx: Prisma.TransactionClient,
    invoiceId: string,
  ): Promise<number> {
    const result = await tx.payment.aggregate({
      where: {
        invoiceId,
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }

  /**
   * Создание платежа (с транзакцией для атомарности)
   */
  async create(dto: CreatePaymentDto): Promise<any> {
    // Проверка существования клиента
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${dto.clientId} not found`);
    }

    // Если указан invoiceId, проверяем счет и валидируем сумму
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: dto.invoiceId },
        include: {
          payments: {
            where: { status: PaymentStatus.COMPLETED },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice with ID ${dto.invoiceId} not found`);
      }

      // Проверяем, что счет не отменен
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Cannot create payment for cancelled invoice');
      }

      // Рассчитываем уже оплаченную сумму
      const totalPaid = await this.calculateTotalPaid(dto.invoiceId);
      const totalAmount = Number(invoice.totalAmount);
      const unpaidAmount = totalAmount - totalPaid;

      // Валидация: сумма платежа не должна превышать непогашенную сумму
      if (dto.amount > unpaidAmount) {
        throw new BadRequestException(
          `Payment amount ${dto.amount} exceeds unpaid amount ${unpaidAmount.toFixed(2)}`,
        );
      }
    }

    // Автоматическая установка статуса COMPLETED для наличных платежей
    const paymentStatus =
      dto.paymentMethod === PaymentMethod.CASH
        ? PaymentStatus.COMPLETED
        : PaymentStatus.PENDING;

    // Выполняем в транзакции: создание платежа + обновление статуса счета
    const payment = await this.prisma.$transaction(async (tx) => {
      // Создание платежа
      const newPayment = await tx.payment.create({
        data: {
          clientId: dto.clientId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paymentType: dto.paymentType,
          status: paymentStatus,
          invoiceId: dto.invoiceId,
          subscriptionId: dto.subscriptionId,
          rentalId: dto.rentalId,
          notes: dto.notes,
          transactionId: dto.transactionId,
        },
        include: {
          client: true,
          invoice: true,
          subscription: true,
          rental: true,
        },
      });

      // Обновляем статус счета в той же транзакции
      if (dto.invoiceId && paymentStatus === PaymentStatus.COMPLETED) {
        const invoice = await tx.invoice.findUnique({
          where: { id: dto.invoiceId },
        });

        if (invoice) {
          const totalPaid = await this.calculateTotalPaidInTx(tx, dto.invoiceId);
          const totalAmount = Number(invoice.totalAmount);

          let newStatus: InvoiceStatus;
          let paidAt: Date | null = null;

          if (totalPaid >= totalAmount) {
            newStatus = InvoiceStatus.PAID;
            paidAt = new Date();
          } else if (totalPaid > 0) {
            newStatus = InvoiceStatus.PARTIALLY_PAID;
          } else {
            newStatus = InvoiceStatus.PENDING;
          }

          if (invoice.status !== newStatus) {
            await tx.invoice.update({
              where: { id: dto.invoiceId },
              data: {
                status: newStatus,
                paidAt: newStatus === InvoiceStatus.PAID ? paidAt : null,
                version: { increment: 1 },
              },
            });
          }
        }
      }

      return newPayment;
    });

    // Обновить активность клиента и автоматически реактивировать если нужно
    await this.clientActivityService.reactivateClientIfNeeded(dto.clientId);

    return payment;
  }

  /**
   * Получение списка платежей с фильтрацией и пагинацией
   */
  async findAll(filters: PaymentFilterDto): Promise<any> {
    const {
      clientId,
      invoiceId,
      subscriptionId,
      rentalId,
      paymentMethod,
      paymentType,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.PaymentWhereInput = {};

    if (clientId) where.clientId = clientId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (subscriptionId) where.subscriptionId = subscriptionId;
    if (rentalId) where.rentalId = rentalId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (paymentType) where.paymentType = paymentType;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          client: true,
          invoice: true,
          subscription: true,
          rental: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получение одного платежа
   */
  async findOne(id: string): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        client: true,
        invoice: true,
        subscription: true,
        rental: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  /**
   * Обновление платежа (только для ADMIN)
   */
  async update(id: string, dto: UpdatePaymentDto): Promise<any> {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    // Проверка: нельзя изменить статус уже завершенного платежа на FAILED/REFUNDED
    // без специальной логики возврата
    if (
      existingPayment.status === PaymentStatus.COMPLETED &&
      dto.status === PaymentStatus.REFUNDED
    ) {
      // При возврате платежа обновляем статус счета
      const payment = await this.prisma.payment.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes,
          transactionId: dto.transactionId,
        },
        include: {
          client: true,
          invoice: true,
        },
      });

      // Обновляем статус счета после возврата
      if (payment.invoiceId) {
        await this.updateInvoiceStatus(payment.invoiceId);
      }

      return payment;
    }

    // Обычное обновление
    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        transactionId: dto.transactionId,
      },
      include: {
        client: true,
        invoice: true,
        subscription: true,
        rental: true,
      },
    });

    // Если статус изменился на COMPLETED, обновляем invoice
    if (
      dto.status === PaymentStatus.COMPLETED &&
      existingPayment.status !== PaymentStatus.COMPLETED &&
      payment.invoiceId
    ) {
      await this.updateInvoiceStatus(payment.invoiceId);
    }

    return payment;
  }

  /**
   * Удаление платежа (только для ADMIN)
   * При удалении платежа обновляется статус счета
   */
  async remove(id: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    const invoiceId = payment.invoiceId;

    // Удаляем платеж
    await this.prisma.payment.delete({
      where: { id },
    });

    // Обновляем статус счета после удаления платежа
    if (invoiceId) {
      await this.updateInvoiceStatus(invoiceId);
    }
  }
}
