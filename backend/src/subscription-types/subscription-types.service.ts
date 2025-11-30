import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionTypeDto } from './dto/create-subscription-type.dto';
import { UpdateSubscriptionTypeDto } from './dto/update-subscription-type.dto';
import { SubscriptionTypeFilterDto } from './dto/subscription-type-filter.dto';

@Injectable()
export class SubscriptionTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateSubscriptionTypeDto) {
    return this.prisma.subscriptionType.create({
      data: {
        ...createDto,
        price: createDto.price,
      },
      include: {
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
    });
  }

  async findAll(filter: SubscriptionTypeFilterDto = {}) {
    const { groupId, type, excludeTypes, isActive, page = 1, limit = 50 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (groupId) where.groupId = groupId;
    if (type) {
      where.type = type;
    } else if (excludeTypes?.length) {
      where.type = { notIn: excludeTypes };
    }
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.subscriptionType.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
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
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      }),
      this.prisma.subscriptionType.count({ where }),
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

  async findAllByGroup(groupId: string) {
    return this.prisma.subscriptionType.findMany({
      where: { groupId, isActive: true },
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    });
  }

  async findOne(id: string) {
    const subscriptionType = await this.prisma.subscriptionType.findUnique({
      where: { id },
      include: {
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
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!subscriptionType) {
      throw new NotFoundException(`Subscription type with ID ${id} not found`);
    }

    return subscriptionType;
  }

  async update(id: string, updateDto: UpdateSubscriptionTypeDto) {
    // Check if exists
    await this.findOne(id);

    return this.prisma.subscriptionType.update({
      where: { id },
      data: {
        ...updateDto,
        price: updateDto.price !== undefined ? updateDto.price : undefined,
      },
      include: {
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
    });
  }

  async remove(id: string) {
    // Check if exists
    await this.findOne(id);

    // Check if has active subscriptions
    const count = await this.prisma.subscription.count({
      where: { subscriptionTypeId: id, status: 'ACTIVE' },
    });

    if (count > 0) {
      throw new Error(
        `Cannot delete subscription type with ${count} active subscriptions`,
      );
    }

    return this.prisma.subscriptionType.delete({ where: { id } });
  }
}
