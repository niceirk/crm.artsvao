import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { ClientStatus, AuditAction } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { normalizePhone } from '../common/utils/phone.util';
import { S3StorageService } from '../common/services/s3-storage.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private s3Storage: S3StorageService,
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
        benefitCategory: {
          select: {
            id: true,
            name: true,
            discountPercent: true,
          },
        },
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
      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        // Разбиваем поисковый запрос на слова для поиска комбинаций ФИО
        const searchWords = trimmedSearch.split(/\s+/).filter(word => word.length > 0);

        if (searchWords.length === 1) {
          // Одно слово - ищем по всем полям
          where.OR = [
            { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
            { lastName: { contains: trimmedSearch, mode: 'insensitive' } },
            { middleName: { contains: trimmedSearch, mode: 'insensitive' } },
            { email: { contains: trimmedSearch, mode: 'insensitive' } },
            { phone: { contains: trimmedSearch, mode: 'insensitive' } },
          ];
        } else {
          // Несколько слов - каждое слово должно быть найдено в одном из полей ФИО
          // Это позволяет искать "Иванов Иван" или "Иван Иванович" и т.д.
          where.AND = searchWords.map(word => ({
            OR: [
              { firstName: { contains: word, mode: 'insensitive' } },
              { lastName: { contains: word, mode: 'insensitive' } },
              { middleName: { contains: word, mode: 'insensitive' } },
            ],
          }));
        }
      }
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
          benefitCategory: {
            select: {
              id: true,
              name: true,
              discountPercent: true,
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
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const searchWords = trimmedQuery.split(/\s+/).filter(word => word.length > 0);

    let searchCondition: any;

    if (searchWords.length === 1) {
      // Одно слово - ищем по всем полям
      searchCondition = {
        OR: [
          { firstName: { contains: trimmedQuery, mode: 'insensitive' } },
          { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
          { middleName: { contains: trimmedQuery, mode: 'insensitive' } },
          { email: { contains: trimmedQuery, mode: 'insensitive' } },
          { phone: { contains: trimmedQuery, mode: 'insensitive' } },
        ],
      };
    } else {
      // Несколько слов - каждое слово должно быть найдено в одном из полей ФИО
      searchCondition = {
        AND: searchWords.map(word => ({
          OR: [
            { firstName: { contains: word, mode: 'insensitive' } },
            { lastName: { contains: word, mode: 'insensitive' } },
            { middleName: { contains: word, mode: 'insensitive' } },
          ],
        })),
      };
    }

    return this.prisma.client.findMany({
      where: {
        ...searchCondition,
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

  /**
   * Загрузить фото клиента в S3
   */
  async uploadPhoto(clientId: string, file: Express.Multer.File, userId: string) {
    const client = await this.findOne(clientId);

    // Удаляем старое фото из S3, если оно есть
    if (client.photoUrl && !client.photoUrl.startsWith('/uploads/')) {
      try {
        const urlParts = client.photoUrl.split('/');
        const fileName = `clients/${urlParts[urlParts.length - 1]}`;
        await this.s3Storage.deleteImage(fileName);
      } catch (error) {
        this.logger.warn(`Failed to delete old photo: ${error.message}`);
      }
    }

    // Загружаем новое фото в S3
    const result = await this.s3Storage.uploadImage(file, 'clients', 800, 85);

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: { photoUrl: result.imageUrl },
      include: {
        leadSource: true,
        benefitCategory: {
          select: {
            id: true,
            name: true,
            discountPercent: true,
          },
        },
      },
    });

    // Логируем действие
    await this.auditLog.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Client',
      entityId: clientId,
      changes: {
        action: 'upload_photo',
        photoUrl: result.imageUrl,
      },
    });

    return updatedClient;
  }

  /**
   * Удалить фото клиента из S3
   */
  async deletePhoto(clientId: string, userId: string) {
    const client = await this.findOne(clientId);

    // Удаляем фото из S3, если оно есть
    if (client.photoUrl && !client.photoUrl.startsWith('/uploads/')) {
      try {
        const urlParts = client.photoUrl.split('/');
        const fileName = `clients/${urlParts[urlParts.length - 1]}`;
        await this.s3Storage.deleteImage(fileName);
      } catch (error) {
        this.logger.warn(`Failed to delete photo from S3: ${error.message}`);
      }
    }

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: { photoUrl: null },
      include: {
        leadSource: true,
        benefitCategory: {
          select: {
            id: true,
            name: true,
            discountPercent: true,
          },
        },
      },
    });

    // Логируем действие
    await this.auditLog.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Client',
      entityId: clientId,
      changes: {
        action: 'delete_photo',
      },
    });

    return updatedClient;
  }
}
