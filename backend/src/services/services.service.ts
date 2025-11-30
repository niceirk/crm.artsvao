import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceFilterDto } from './dto/service-filter.dto';
import { Prisma } from '@prisma/client';
import { updateWithVersionCheck } from '../common/utils/optimistic-lock.util';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Автоматический расчет цены с НДС
   */
  private calculatePriceWithVat(basePrice: number, vatRate: number): number {
    return basePrice * (1 + vatRate / 100);
  }

  async create(createDto: CreateServiceDto) {
    // Валидация categoryId
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: createDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Категория услуг не найдена');
    }

    // Валидация groupId (если указан)
    if (createDto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: createDto.groupId },
      });

      if (!group) {
        throw new NotFoundException('Группа не найдена');
      }
    }

    // Валидация roomId (если указан)
    if (createDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: createDto.roomId },
      });

      if (!room) {
        throw new NotFoundException('Помещение не найдено');
      }
    }

    // Автоматический расчет priceWithVat
    const vatRate = createDto.vatRate ?? 20.0;
    const priceWithVat = this.calculatePriceWithVat(createDto.basePrice, vatRate);

    return this.prisma.service.create({
      data: {
        ...createDto,
        vatRate,
        priceWithVat,
      },
      include: {
        category: true,
        group: true,
        room: true,
      },
    });
  }

  async findAll(filterDto?: ServiceFilterDto) {
    const where: Prisma.ServiceWhereInput = {};

    if (filterDto?.categoryId) {
      where.categoryId = filterDto.categoryId;
    }

    if (filterDto?.serviceType) {
      where.serviceType = filterDto.serviceType;
    }

    if (filterDto?.groupId) {
      where.groupId = filterDto.groupId;
    }

    if (filterDto?.roomId) {
      where.roomId = filterDto.roomId;
    }

    const page = filterDto?.page || 1;
    const limit = filterDto?.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
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
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
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

  async findAllActive(filterDto?: ServiceFilterDto) {
    const where: Prisma.ServiceWhereInput = {
      isActive: true,
    };

    if (filterDto?.categoryId) {
      where.categoryId = filterDto.categoryId;
    }

    if (filterDto?.serviceType) {
      where.serviceType = filterDto.serviceType;
    }

    if (filterDto?.groupId) {
      where.groupId = filterDto.groupId;
    }

    if (filterDto?.roomId) {
      where.roomId = filterDto.roomId;
    }

    const page = filterDto?.page || 1;
    const limit = filterDto?.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
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
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
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
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        group: {
          include: {
            studio: true,
            teacher: true,
          },
        },
        room: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Услуга не найдена');
    }

    return service;
  }

  async update(id: string, updateDto: UpdateServiceDto) {
    // Проверка существования
    await this.findOne(id);

    // Извлекаем version для проверки
    const { version, ...restDto } = updateDto;

    // Валидация categoryId (если изменяется)
    if (restDto.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: restDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Категория услуг не найдена');
      }
    }

    // Валидация groupId (если изменяется)
    if (restDto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: restDto.groupId },
      });

      if (!group) {
        throw new NotFoundException('Группа не найдена');
      }
    }

    // Валидация roomId (если изменяется)
    if (restDto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: restDto.roomId },
      });

      if (!room) {
        throw new NotFoundException('Помещение не найдено');
      }
    }

    // Получаем текущие данные для расчета НДС
    const currentService = await this.prisma.service.findUnique({
      where: { id },
    });

    const basePrice = restDto.basePrice ?? currentService.basePrice.toNumber();
    const vatRate = restDto.vatRate ?? currentService.vatRate.toNumber();
    const priceWithVat = this.calculatePriceWithVat(basePrice, vatRate);

    const data = {
      ...restDto,
      priceWithVat,
    };

    const include = {
      category: true,
      group: true,
      room: true,
    };

    // Используем условную проверку версии (только если version передан)
    if (version !== undefined) {
      return updateWithVersionCheck(
        this.prisma,
        'service',
        id,
        version,
        data,
        include,
      );
    } else {
      return this.prisma.service.update({
        where: { id },
        data,
        include,
      });
    }
  }

  async remove(id: string) {
    // Проверка существования
    await this.findOne(id);

    // TODO: В будущем добавить проверку использования в InvoiceItems
    // const invoiceItemsCount = await this.prisma.invoiceItem.count({
    //   where: { serviceId: id },
    // });
    //
    // if (invoiceItemsCount > 0) {
    //   throw new ConflictException(
    //     `Невозможно удалить услугу. Используется в счетах: ${invoiceItemsCount}`,
    //   );
    // }

    return this.prisma.service.delete({
      where: { id },
    });
  }
}
