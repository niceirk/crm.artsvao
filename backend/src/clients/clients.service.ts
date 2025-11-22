import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { ClientStatus, AuditAction } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { normalizePhone } from '../common/utils/phone.util';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(createClientDto: CreateClientDto, userId: string) {
    // Normalize phone number
    const normalizedPhone = createClientDto.phone
      ? normalizePhone(createClientDto.phone)
      : '';

    const client = await this.prisma.client.create({
      data: {
        clientType: createClientDto.clientType,
        firstName: createClientDto.firstName,
        lastName: createClientDto.lastName,
        middleName: createClientDto.middleName,
        companyName: createClientDto.companyName,
        inn: createClientDto.inn,
        gender: createClientDto.gender,
        phone: normalizedPhone,
        email: createClientDto.email,
        address: createClientDto.address,
        notes: createClientDto.notes,
        photoUrl: createClientDto.photoUrl,
        leadSourceId: createClientDto.leadSourceId,
        passportNumber: createClientDto.passportNumber,
        birthCertificate: createClientDto.birthCertificate,
        snils: createClientDto.snils,
        phoneAdditional: createClientDto.phoneAdditional,
        dateOfBirth: createClientDto.dateOfBirth
          ? new Date(createClientDto.dateOfBirth)
          : null,
      },
      include: {
        leadSource: true,
      },
    });

    // Log the creation
    await this.auditLog.log({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Client',
      entityId: client.id,
      changes: { created: createClientDto },
    });

    return client;
  }

  async findAll(filterDto: ClientFilterDto) {
    const {
      search,
      status,
      leadSourceId,
      benefitCategoryId,
      dateFrom,
      dateTo,
      subscriptionFilter,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { middleName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (leadSourceId) {
      where.leadSourceId = leadSourceId;
    }

    if (benefitCategoryId) {
      where.benefitCategoryId = benefitCategoryId;
    }

    // Фильтрация по периоду регистрации
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Добавляем 1 день, чтобы включить весь указанный день
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        where.createdAt.lt = endDate;
      }
    }

    // Фильтрация по наличию абонементов
    if (subscriptionFilter && subscriptionFilter !== 'all') {
      if (subscriptionFilter === 'with') {
        where.subscriptions = {
          some: {},
        };
      } else if (subscriptionFilter === 'without') {
        where.subscriptions = {
          none: {},
        };
      }
    }

    // Определяем сортировку
    let orderBy: any;
    if (sortBy === 'name') {
      // Сортировка по ФИО: сначала по фамилии, затем по имени
      orderBy = [
        { lastName: sortOrder },
        { firstName: sortOrder },
        { middleName: sortOrder },
      ];
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'dateOfBirth') {
      orderBy = { dateOfBirth: sortOrder };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else {
      // По умолчанию - сортировка по ФИО
      orderBy = [
        { lastName: 'asc' },
        { firstName: 'asc' },
        { middleName: 'asc' },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          leadSource: {
            select: {
              id: true,
              name: true,
            },
          },
          // Relations loaded only on detail view for performance
          _count: {
            select: {
              relations: true,
              relatedTo: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        leadSource: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        benefitCategory: {
          select: {
            id: true,
            name: true,
            discountPercent: true,
          },
        },
        relations: {
          select: {
            id: true,
            relationType: true,
            relatedClient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                phone: true,
              },
            },
          },
          take: 10,
        },
        relatedTo: {
          select: {
            id: true,
            relationType: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                phone: true,
              },
            },
          },
          take: 10,
        },
        subscriptions: {
          select: {
            id: true,
            validMonth: true,
            startDate: true,
            endDate: true,
            status: true,
            paidPrice: true,
            remainingVisits: true,
            subscriptionType: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        documents: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        telegramAccounts: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            isNotificationsEnabled: true,
            createdAt: true,
            conversations: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, userId: string) {
    const oldClient = await this.findOne(id); // Check if exists

    // Normalize phone if provided
    const data: any = { ...updateClientDto };
    if (updateClientDto.phone) {
      data.phone = normalizePhone(updateClientDto.phone);
    }
    if (updateClientDto.dateOfBirth) {
      data.dateOfBirth = new Date(updateClientDto.dateOfBirth);
    }
    // Gender field is already in updateClientDto, no need for special handling
    // clientType, companyName, and inn are also already in updateClientDto

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data,
      include: {
        leadSource: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Log the update with changes
    await this.auditLog.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Client',
      entityId: id,
      changes: {
        before: this.sanitizeForLog(oldClient),
        after: updateClientDto,
      },
    });

    return updatedClient;
  }

  private sanitizeForLog(client: any) {
    const { subscriptions, payments, relations, relatedTo, ...rest } = client;
    return rest;
  }

  async remove(id: string, userId: string) {
    const client = await this.findOne(id); // Check if exists

    // Soft delete - update status to INACTIVE
    const deletedClient = await this.prisma.client.update({
      where: { id },
      data: { status: ClientStatus.INACTIVE as any },
    });

    // Log the deletion
    await this.auditLog.log({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Client',
      entityId: id,
      changes: {
        deleted: {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          status: ClientStatus.INACTIVE,
        },
      },
    });

    return deletedClient;
  }

  async search(query: string) {
    return this.prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { middleName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
        status: { not: ClientStatus.INACTIVE as any },
      },
      take: 20,
      orderBy: { lastName: 'asc' },
    });
  }

  /**
   * Проверяет наличие клиента с таким же телефоном
   * @param phone - телефон для проверки
   * @param excludeId - ID клиента, который нужно исключить из поиска (для update)
   */
  async checkDuplicate(phone: string, excludeId?: string) {
    if (!phone) {
      return null;
    }

    try {
      const normalizedPhone = normalizePhone(phone);

      const where: any = {
        phone: normalizedPhone,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const duplicate = await this.prisma.client.findFirst({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      });

      return duplicate;
    } catch (error) {
      // If phone format is invalid, return null
      return null;
    }
  }

  /**
   * Отвязать Telegram аккаунт от клиента
   */
  async unlinkTelegramAccount(clientId: string, telegramAccountId: string, userId: string) {
    // Проверяем, что клиент существует
    await this.findOne(clientId);

    // Проверяем, что Telegram аккаунт принадлежит клиенту
    const telegramAccount = await this.prisma.telegramAccount.findUnique({
      where: { id: telegramAccountId },
    });

    if (!telegramAccount) {
      throw new NotFoundException(`Telegram account with ID ${telegramAccountId} not found`);
    }

    if (telegramAccount.clientId !== clientId) {
      throw new NotFoundException(
        `Telegram account ${telegramAccountId} does not belong to client ${clientId}`
      );
    }

    // Отвязываем аккаунт (не удаляем, сохраняем историю сообщений)
    const updatedAccount = await this.prisma.telegramAccount.update({
      where: { id: telegramAccountId },
      data: {
        clientId: null,
        state: 'GUEST',
      },
    });

    // Логируем действие
    await this.auditLog.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Client',
      entityId: clientId,
      changes: {
        action: 'unlink_telegram',
        telegramAccountId,
        username: telegramAccount.username,
      },
    });

    return updatedAccount;
  }

  /**
   * Переключить уведомления для Telegram аккаунта
   */
  async toggleNotifications(
    clientId: string,
    telegramAccountId: string,
    enabled: boolean,
    userId: string,
  ) {
    // Проверяем, что клиент существует
    await this.findOne(clientId);

    // Проверяем, что Telegram аккаунт принадлежит клиенту
    const telegramAccount = await this.prisma.telegramAccount.findUnique({
      where: { id: telegramAccountId },
    });

    if (!telegramAccount) {
      throw new NotFoundException(`Telegram account with ID ${telegramAccountId} not found`);
    }

    if (telegramAccount.clientId !== clientId) {
      throw new NotFoundException(
        `Telegram account ${telegramAccountId} does not belong to client ${clientId}`
      );
    }

    // Обновляем настройку уведомлений
    const updatedAccount = await this.prisma.telegramAccount.update({
      where: { id: telegramAccountId },
      data: {
        isNotificationsEnabled: enabled,
      },
    });

    // Логируем действие
    await this.auditLog.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Client',
      entityId: clientId,
      changes: {
        action: 'toggle_telegram_notifications',
        telegramAccountId,
        username: telegramAccount.username,
        isNotificationsEnabled: enabled,
      },
    });

    return updatedAccount;
  }
}
