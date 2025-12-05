import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { InvoicesService } from '../invoices/invoices.service';
import { RentalApplicationsService } from '../rental-applications/rental-applications.service';
import { ServiceType, WriteOffTiming } from '@prisma/client';

@Injectable()
export class RentalsService {
  private readonly logger = new Logger(RentalsService.name);

  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
    private invoicesService: InvoicesService,
    @Inject(forwardRef(() => RentalApplicationsService))
    private rentalApplicationsService: RentalApplicationsService,
  ) {}

  async create(createRentalDto: CreateRentalDto) {
    // Verify room exists
    const room = await this.prisma.room.findUnique({
      where: { id: createRentalDto.roomId },
    });
    if (!room) {
      throw new BadRequestException(`Room with ID ${createRentalDto.roomId} not found`);
    }

    // Verify manager exists if provided
    if (createRentalDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: createRentalDto.managerId },
      });
      if (!manager) {
        throw new BadRequestException(`Manager with ID ${createRentalDto.managerId} not found`);
      }
    }

    // Check for conflicts with schedules and other rentals
    await this.conflictChecker.checkConflicts({
      date: createRentalDto.date,
      startTime: createRentalDto.startTime,
      endTime: createRentalDto.endTime,
      roomIds: [createRentalDto.roomId],
    });

    // Convert date and time strings to Date objects using UTC
    const [startHour, startMin] = createRentalDto.startTime.split(':').map(Number);
    const [endHour, endMin] = createRentalDto.endTime.split(':').map(Number);

    const createData = {
      ...createRentalDto,
      clientPhone: createRentalDto.clientPhone || 'Не указан',
      eventType: createRentalDto.eventType || 'Аренда',
      totalPrice: createRentalDto.totalPrice ?? 0,
      date: new Date(createRentalDto.date),
      startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
    };

    const rental = await this.prisma.rental.create({
      data: createData,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    // Автоматическое создание счета, если указан clientId
    if (createRentalDto.clientId && createRentalDto.totalPrice > 0) {
      try {
        await this.invoicesService.create({
          clientId: createRentalDto.clientId,
          rentalId: rental.id,
          items: [
            {
              serviceType: ServiceType.RENTAL,
              serviceName: `Аренда ${room.name}${room.number ? ` №${room.number}` : ''}`,
              serviceDescription: `${createRentalDto.eventType || 'Мероприятие'} - ${new Date(createRentalDto.date).toLocaleDateString('ru-RU')} (${createRentalDto.startTime}-${createRentalDto.endTime})`,
              roomId: createRentalDto.roomId,
              quantity: 1,
              basePrice: Number(createRentalDto.totalPrice),
              unitPrice: Number(createRentalDto.totalPrice),
              vatRate: 0,
              discountPercent: 0,
              writeOffTiming: WriteOffTiming.ON_SALE,
            },
          ],
          notes: createRentalDto.notes,
        }, createRentalDto.managerId);
      } catch (error) {
        // Логируем ошибку, но не прерываем создание аренды
        this.logger.error('Failed to auto-create invoice for rental:', error);
      }
    }

    return rental;
  }

  async findAll(queryParams?: { date?: string; startDate?: string; endDate?: string; roomId?: string | string[]; status?: string }) {
    const where: any = {};

    // Поддержка диапазона дат для недельного и месячного режима
    if (queryParams?.startDate && queryParams?.endDate) {
      where.date = {
        gte: new Date(queryParams.startDate),
        lte: new Date(queryParams.endDate),
      };
    } else if (queryParams?.date) {
      // Одна дата для дневного режима
      where.date = new Date(queryParams.date);
    } else {
      // Если дата не передана, ограничиваем выборку последними 3 месяцами
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      where.date = {
        gte: threeMonthsAgo,
      };
    }

    if (queryParams?.roomId) {
      where.roomId = Array.isArray(queryParams.roomId)
        ? { in: queryParams.roomId }
        : queryParams.roomId;
    }
    if (queryParams?.status) {
      where.status = queryParams.status;
    }

    return this.prisma.rental.findMany({
      where,
      take: 500, // Лимит для предотвращения перегрузки
      orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rentalApplication: {
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            invoices: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                totalAmount: true,
                paidAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        rentalApplication: {
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            invoices: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                totalAmount: true,
                paidAt: true,
              },
            },
            _count: {
              select: {
                rentals: true,
              },
            },
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (!rental) {
      throw new NotFoundException(`Rental with ID ${id} not found`);
    }

    return rental;
  }

  async update(id: string, updateRentalDto: UpdateRentalDto) {
    const existing = await this.findOne(id);

    // Verify room exists if being updated
    if (updateRentalDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: updateRentalDto.roomId },
      });
      if (!room) {
        throw new BadRequestException(`Room with ID ${updateRentalDto.roomId} not found`);
      }
    }

    // Verify manager exists if being updated
    if (updateRentalDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: updateRentalDto.managerId },
      });
      if (!manager) {
        throw new BadRequestException(`Manager with ID ${updateRentalDto.managerId} not found`);
      }
    }

    // Check for conflicts if date/time/room changed
    if (
      updateRentalDto.date ||
      updateRentalDto.startTime ||
      updateRentalDto.endTime ||
      updateRentalDto.roomId
    ) {
      const existingStart = this.extractTimeString(existing.startTime);
      const existingEnd = this.extractTimeString(existing.endTime);

      await this.conflictChecker.checkConflicts({
        date: updateRentalDto.date || existing.date.toISOString().split('T')[0],
        startTime: updateRentalDto.startTime || existingStart,
        endTime: updateRentalDto.endTime || existingEnd,
        roomIds: [updateRentalDto.roomId || existing.room.id],
        excludeRentalId: id,
      });
    }

    // Convert date and time strings to Date objects using UTC
    const updateData: any = { ...updateRentalDto };
    if (updateRentalDto.date) {
      updateData.date = new Date(updateRentalDto.date);
    }
    if (updateRentalDto.startTime) {
      const [hour, min] = updateRentalDto.startTime.split(':').map(Number);
      updateData.startTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
    }
    if (updateRentalDto.endTime) {
      const [hour, min] = updateRentalDto.endTime.split(':').map(Number);
      updateData.endTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
    }

    return this.prisma.rental.update({
      where: { id },
      data: updateData,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            number: true,
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
  }

  async remove(id: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        rentalApplication: {
          include: {
            _count: { select: { rentals: true } },
            invoices: { where: { status: 'PAID' } },
          },
        },
        _count: { select: { payments: true } },
      },
    });

    if (!rental) {
      throw new NotFoundException(`Rental with ID ${id} not found`);
    }

    if (rental._count.payments > 0) {
      throw new BadRequestException('Нельзя удалить аренду с записями об оплате');
    }

    // Если связан с заявкой
    if (rental.rentalApplicationId && rental.rentalApplication) {
      const app = rental.rentalApplication;

      // Проверка на оплаченные счета
      if (app.invoices.length > 0) {
        throw new BadRequestException('Нельзя удалить: заявка имеет оплаченные счета');
      }

      // Если единственный слот - удалить всю заявку
      if (app._count.rentals === 1) {
        await this.rentalApplicationsService.remove(app.id);
        return { deleted: 'application', applicationId: app.id };
      }

      // Если не единственный - удалить слот из заявки
      await this.rentalApplicationsService.removeRental(app.id, id);
      return { deleted: 'slot', applicationId: app.id };
    }

    // Обычное удаление (без заявки)
    await this.prisma.rental.delete({ where: { id } });
    return { deleted: 'rental' };
  }

  /**
   * Extract time string in HH:MM format from Date object
   */
  private extractTimeString(dateTime: Date): string {
    const hours = dateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
