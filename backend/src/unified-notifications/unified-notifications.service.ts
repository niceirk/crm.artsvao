import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRendererService } from './notification-renderer.service';
import { TelegramChannelAdapter } from './channels/telegram.channel';
import { EmailChannelAdapter } from './channels/email.channel';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { MassSendDto } from './dto/mass-send.dto';
import { NotificationQueryDto, TemplateQueryDto } from './dto/notification-query.dto';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationEventType,
  NotificationInitiator,
  Prisma,
} from '@prisma/client';

@Injectable()
export class UnifiedNotificationsService {
  private readonly logger = new Logger(UnifiedNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rendererService: NotificationRendererService,
    private readonly telegramChannel: TelegramChannelAdapter,
    private readonly emailChannel: EmailChannelAdapter,
  ) {}

  // ============================
  // УВЕДОМЛЕНИЯ
  // ============================

  /**
   * Создание уведомления в очередь
   */
  async createNotification(dto: CreateNotificationDto) {
    // Проверяем настройки клиента если указан recipientId
    if (dto.recipientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.recipientId },
        select: {
          notificationsTelegramEnabled: true,
          notificationsEmailEnabled: true,
          allowServiceNotifications: true,
          allowMarketingNotifications: true,
        },
      });

      if (client && !this.isClientAllowed(client, dto.channel, dto.eventType)) {
        this.logger.warn(
          `Client ${dto.recipientId} has disabled ${dto.channel} notifications for ${dto.eventType}`,
        );
        return null; // Не создаём уведомление если клиент отключил
      }
    }

    // Находим шаблон
    const template = await this.prisma.notificationTemplateV2.findFirst({
      where: {
        code: dto.templateCode,
        channel: dto.channel,
        isActive: true,
      },
    });

    if (!template) {
      this.logger.warn(
        `Template not found: ${dto.templateCode} for channel ${dto.channel}`,
      );
    }

    return this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        channel: dto.channel,
        recipientAddress: dto.recipientAddress,
        eventType: dto.eventType,
        templateId: template?.id,
        payload: dto.payload || {},
        initiator: dto.initiator || NotificationInitiator.SYSTEM,
        initiatorId: dto.initiatorId,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      },
    });
  }

  /**
   * Немедленная отправка уведомления (для критичных)
   */
  async sendImmediate(dto: CreateNotificationDto) {
    const template = await this.prisma.notificationTemplateV2.findFirst({
      where: {
        code: dto.templateCode,
        channel: dto.channel,
        isActive: true,
      },
    });

    const content = await this.rendererService.render(
      template,
      dto.payload || {},
    );

    const channel =
      dto.channel === NotificationChannel.TELEGRAM
        ? this.telegramChannel
        : this.emailChannel;

    const result = await channel.send(dto.recipientAddress, content);

    // Логируем результат
    await this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        channel: dto.channel,
        recipientAddress: dto.recipientAddress,
        eventType: dto.eventType,
        templateId: template?.id,
        payload: dto.payload || {},
        status: result.success
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED,
        sentAt: result.success ? new Date() : null,
        lastError: result.error,
        externalId: result.externalId,
        initiator: dto.initiator || NotificationInitiator.SYSTEM,
        initiatorId: dto.initiatorId,
        attempts: 1,
      },
    });

    return result;
  }

  /**
   * Получение списка уведомлений с фильтрами
   */
  async getNotifications(query: NotificationQueryDto) {
    const where: Prisma.NotificationWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    if (query.eventType) where.eventType = query.eventType;
    if (query.recipientId) where.recipientId = query.recipientId;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      where.recipientAddress = { contains: query.search, mode: 'insensitive' };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          recipient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          template: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получение уведомления по ID
   */
  async getNotification(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        template: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Отмена уведомления
   */
  async cancelNotification(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status !== NotificationStatus.PENDING) {
      throw new BadRequestException(
        'Can only cancel pending notifications',
      );
    }

    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.CANCELED },
    });
  }

  /**
   * Повторная отправка уведомления
   */
  async retryNotification(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status !== NotificationStatus.FAILED) {
      throw new BadRequestException('Can only retry failed notifications');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.PENDING,
        attempts: 0,
        lastError: null,
        nextRetryAt: null,
      },
    });
  }

  // ============================
  // МАССОВЫЕ РАССЫЛКИ
  // ============================

  /**
   * Создание массовой рассылки
   */
  async createMassSend(dto: MassSendDto, initiatorId?: string) {
    const recipients = await this.getRecipients(dto.filters, dto.channel);

    // В тестовом режиме берём только первых 10
    const targetRecipients = dto.testMode
      ? recipients.slice(0, 10)
      : recipients;

    let queued = 0;
    let skipped = 0;

    for (const recipient of targetRecipients) {
      // Проверяем настройки клиента
      if (
        !this.isClientAllowed(
          recipient,
          dto.channel,
          NotificationEventType.MASS_BROADCAST,
        )
      ) {
        skipped++;
        continue;
      }

      const address = this.getRecipientAddress(recipient, dto.channel);
      if (!address) {
        skipped++;
        continue;
      }

      await this.createNotification({
        recipientId: recipient.id,
        channel: dto.channel,
        recipientAddress: address,
        eventType: NotificationEventType.MASS_BROADCAST,
        templateCode: dto.templateCode,
        payload: {
          ...dto.payload,
          clientName: `${recipient.firstName} ${recipient.lastName}`.trim(),
          clientFirstName: recipient.firstName,
          clientLastName: recipient.lastName,
        },
        initiator: NotificationInitiator.MASS_SEND,
        initiatorId,
      });

      queued++;
    }

    this.logger.log(
      `Mass send created: ${queued} queued, ${skipped} skipped${dto.testMode ? ' (TEST MODE)' : ''}`,
    );

    return {
      queued,
      skipped,
      total: targetRecipients.length,
      testMode: dto.testMode || false,
    };
  }

  // ============================
  // ШАБЛОНЫ
  // ============================

  /**
   * Получение списка шаблонов
   */
  async getTemplates(query: TemplateQueryDto) {
    const where: Prisma.NotificationTemplateV2WhereInput = {};

    if (query.channel) where.channel = query.channel;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return this.prisma.notificationTemplateV2.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получение шаблона по ID
   */
  async getTemplate(id: string) {
    const template = await this.prisma.notificationTemplateV2.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Создание шаблона
   */
  async createTemplate(dto: CreateTemplateDto) {
    // Проверяем уникальность code + channel
    const existing = await this.prisma.notificationTemplateV2.findFirst({
      where: {
        code: dto.code,
        channel: dto.channel,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Template with code "${dto.code}" for channel "${dto.channel}" already exists`,
      );
    }

    return this.prisma.notificationTemplateV2.create({
      data: {
        code: dto.code,
        channel: dto.channel,
        name: dto.name,
        description: dto.description,
        subject: dto.subject,
        body: dto.body,
        variablesSchema: dto.variablesSchema,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Обновление шаблона
   */
  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.notificationTemplateV2.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Очищаем кеш рендерера
    this.rendererService.clearCache(id);

    return this.prisma.notificationTemplateV2.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Удаление шаблона
   */
  async deleteTemplate(id: string) {
    const template = await this.prisma.notificationTemplateV2.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Проверяем, нет ли связанных уведомлений
    const notificationsCount = await this.prisma.notification.count({
      where: { templateId: id },
    });

    if (notificationsCount > 0) {
      // Вместо удаления деактивируем
      return this.prisma.notificationTemplateV2.update({
        where: { id },
        data: { isActive: false },
      });
    }

    this.rendererService.clearCache(id);

    return this.prisma.notificationTemplateV2.delete({
      where: { id },
    });
  }

  /**
   * Предпросмотр шаблона
   */
  async previewTemplate(id: string, sampleData: Record<string, any>) {
    const template = await this.prisma.notificationTemplateV2.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.rendererService.preview(
      template.body,
      template.subject,
      sampleData,
      template.channel,
    );
  }

  // ============================
  // СТАТИСТИКА
  // ============================

  /**
   * Получение статистики уведомлений
   */
  async getStats(dateFrom?: string, dateTo?: string) {
    const where: Prisma.NotificationWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [total, byStatus, byChannel, byEventType] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.notification.groupBy({
        by: ['channel'],
        where,
        _count: { id: true },
      }),
      this.prisma.notification.groupBy({
        by: ['eventType'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byChannel: byChannel.reduce(
        (acc, item) => {
          acc[item.channel] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byEventType: byEventType.reduce(
        (acc, item) => {
          acc[item.eventType] = item._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  // ============================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ============================

  /**
   * Проверка разрешений клиента на получение уведомлений
   */
  private isClientAllowed(
    client: {
      notificationsTelegramEnabled: boolean;
      notificationsEmailEnabled: boolean;
      allowServiceNotifications: boolean;
      allowMarketingNotifications: boolean;
    },
    channel: NotificationChannel,
    eventType: NotificationEventType,
  ): boolean {
    // Проверяем канал
    if (
      channel === NotificationChannel.TELEGRAM &&
      !client.notificationsTelegramEnabled
    ) {
      return false;
    }
    if (
      channel === NotificationChannel.EMAIL &&
      !client.notificationsEmailEnabled
    ) {
      return false;
    }

    // Проверяем тип уведомления
    if (
      eventType === NotificationEventType.MASS_BROADCAST &&
      !client.allowMarketingNotifications
    ) {
      return false;
    }

    // Сервисные уведомления
    if (!client.allowServiceNotifications) {
      return false;
    }

    return true;
  }

  /**
   * Получение получателей по фильтрам
   */
  private async getRecipients(
    filters: {
      groupId?: string;
      studioId?: string;
      clientStatus?: string;
      clientIds?: string[];
    },
    channel: NotificationChannel,
  ) {
    const where: Prisma.ClientWhereInput = {
      status: filters.clientStatus
        ? (filters.clientStatus as any)
        : 'ACTIVE',
    };

    if (filters.clientIds && filters.clientIds.length > 0) {
      where.id = { in: filters.clientIds };
    }

    if (filters.groupId) {
      where.groupMemberships = {
        some: {
          groupId: filters.groupId,
          status: 'ACTIVE',
        },
      };
    }

    if (filters.studioId) {
      where.groupMemberships = {
        some: {
          group: { studioId: filters.studioId },
          status: 'ACTIVE',
        },
      };
    }

    // Фильтруем по наличию контакта для канала
    if (channel === NotificationChannel.TELEGRAM) {
      where.telegramAccounts = {
        some: { isNotificationsEnabled: true },
      };
    } else if (channel === NotificationChannel.EMAIL) {
      where.email = { not: null };
    }

    return this.prisma.client.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        notificationsTelegramEnabled: true,
        notificationsEmailEnabled: true,
        allowServiceNotifications: true,
        allowMarketingNotifications: true,
        telegramAccounts: {
          where: { isNotificationsEnabled: true },
          select: { chatId: true },
          take: 1,
        },
      },
    });
  }

  /**
   * Получение адреса получателя для канала
   */
  private getRecipientAddress(
    recipient: {
      email?: string | null;
      telegramAccounts?: { chatId: bigint }[];
    },
    channel: NotificationChannel,
  ): string | null {
    if (channel === NotificationChannel.TELEGRAM) {
      const tgAccount = recipient.telegramAccounts?.[0];
      return tgAccount ? tgAccount.chatId.toString() : null;
    }
    if (channel === NotificationChannel.EMAIL) {
      return recipient.email || null;
    }
    return null;
  }
}
