import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramState, Prisma } from '@prisma/client';
import { TelegramUser } from '../interfaces/telegram-api.interface';
import {
  EventRegistrationContext,
  TelegramAccountWithClient,
} from '../interfaces/state-context.interface';
import { TelegramApiService } from './telegram-api.service';

/**
 * Сервис управления состоянием пользователей Telegram
 * Отвечает за создание, обновление TelegramAccount и Conversation
 */
@Injectable()
export class TelegramStateService {
  private readonly logger = new Logger(TelegramStateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiService: TelegramApiService,
  ) {}

  /**
   * Получить или создать TelegramAccount
   */
  async getOrCreateAccount(
    user: TelegramUser,
    chatId: number,
    clientId?: string | null,
  ) {
    const telegramUserId = BigInt(user.id);

    // Используем upsert для атомарного создания/обновления
    const telegramAccount = await this.prisma.telegramAccount.upsert({
      where: { telegramUserId },
      create: {
        telegramUserId,
        chatId: BigInt(chatId),
        username: user.username || null,
        firstName: user.first_name,
        lastName: user.last_name || null,
        photoUrl: null,
        clientId: clientId || null,
        state: clientId ? TelegramState.IDENTIFIED : TelegramState.NEW_USER,
      },
      update: {
        chatId: BigInt(chatId),
        username: user.username || null,
        firstName: user.first_name,
        lastName: user.last_name || null,
        ...(clientId !== undefined && { clientId }),
      },
    });

    // Получаем аватар пользователя асинхронно в фоне
    this.apiService
      .getUserProfilePhoto(user.id)
      .then((photoUrl) => {
        if (photoUrl && photoUrl !== telegramAccount.photoUrl) {
          return this.prisma.telegramAccount.update({
            where: { id: telegramAccount.id },
            data: { photoUrl },
          });
        }
      })
      .catch((error) => {
        this.logger.warn(
          `Failed to update profile photo for user ${user.id}: ${error.message}`,
        );
      });

    this.logger.log(
      `${telegramAccount.createdAt === telegramAccount.updatedAt ? 'Created' : 'Updated'} TelegramAccount for user ${user.id}`,
    );

    return telegramAccount;
  }

  /**
   * Получить TelegramAccount по telegramUserId
   */
  async getAccount(telegramUserId: bigint) {
    return this.prisma.telegramAccount.findUnique({
      where: { telegramUserId },
    });
  }

  /**
   * Получить TelegramAccount с данными клиента
   */
  async getAccountWithClient(telegramUserId: bigint): Promise<TelegramAccountWithClient | null> {
    const account = await this.prisma.telegramAccount.findUnique({
      where: { telegramUserId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            dateOfBirth: true,
            phone: true,
            status: true,
            relations: {
              include: {
                relatedClient: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    middleName: true,
                    dateOfBirth: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return account as unknown as TelegramAccountWithClient | null;
  }

  /**
   * Обновить состояние пользователя
   */
  async updateState(
    telegramUserId: bigint,
    state: TelegramState,
    registrationContext?: EventRegistrationContext | null,
  ): Promise<void> {
    await this.prisma.telegramAccount.update({
      where: { telegramUserId },
      data: {
        state,
        ...(registrationContext !== undefined && {
          registrationContext: registrationContext as Prisma.InputJsonValue,
        }),
      },
    });

    this.logger.log(`Updated state for user ${telegramUserId} to ${state}`);
  }

  /**
   * Обновить состояние по ID аккаунта
   */
  async updateStateById(
    accountId: string,
    state: TelegramState,
    registrationContext?: EventRegistrationContext | null,
  ): Promise<void> {
    await this.prisma.telegramAccount.update({
      where: { id: accountId },
      data: {
        state,
        ...(registrationContext !== undefined && {
          registrationContext: registrationContext as Prisma.InputJsonValue,
        }),
      },
    });
  }

  /**
   * Привязать TelegramAccount к клиенту
   */
  async linkToClient(telegramUserId: bigint, clientId: string): Promise<void> {
    await this.prisma.telegramAccount.update({
      where: { telegramUserId },
      data: {
        clientId,
        state: TelegramState.IDENTIFIED,
      },
    });

    this.logger.log(`Linked user ${telegramUserId} to client ${clientId}`);
  }

  /**
   * Очистить контекст регистрации
   */
  async clearContext(telegramUserId: bigint): Promise<void> {
    await this.prisma.telegramAccount.update({
      where: { telegramUserId },
      data: { registrationContext: Prisma.JsonNull },
    });
  }

  /**
   * Обновить настройки уведомлений
   */
  async updateNotifications(
    telegramUserId: bigint,
    enabled: boolean,
  ): Promise<void> {
    await this.prisma.telegramAccount.update({
      where: { telegramUserId },
      data: { isNotificationsEnabled: enabled },
    });
  }

  /**
   * Получить или создать Conversation
   */
  async getOrCreateConversation(
    channelAccountId: string,
    clientId?: string | null,
  ) {
    const conversation = await this.prisma.conversation.upsert({
      where: { channelAccountId },
      create: {
        channelAccountId,
        source: 'TELEGRAM',
        status: 'OPEN',
      },
      update: {
        status: 'OPEN',
      },
    });

    this.logger.log(
      `${conversation.createdAt === conversation.updatedAt ? 'Created' : 'Ensured open'} Conversation ${conversation.id}`,
    );

    return conversation;
  }

  /**
   * Проверяет актуальность связи с клиентом
   * @returns true если связь потеряна
   */
  isClientConnectionLost(
    account: { clientId: string | null; state: string },
  ): boolean {
    const isIdentifiedState =
      account.state === TelegramState.IDENTIFIED ||
      account.state === TelegramState.BOUND_MANUALLY;
    const hasNoClient = !account.clientId;

    return isIdentifiedState && hasNoClient;
  }

  /**
   * Проверить, является ли состояние состоянием регистрации на событие
   */
  isEventRegistrationState(state: TelegramState | string | null): boolean {
    if (!state) return false;

    const eventStates: TelegramState[] = [
      TelegramState.EVENT_REGISTRATION_PHONE,
      TelegramState.EVENT_REGISTRATION_NAME,
      TelegramState.EVENT_REGISTRATION_BIRTHDATE,
      TelegramState.EVENT_REGISTRATION_EMAIL,
      TelegramState.EVENT_CHOOSING_CLIENT,
    ];

    return eventStates.includes(state as TelegramState);
  }

  /**
   * Получить контекст регистрации
   */
  getRegistrationContext(
    account: { registrationContext: any },
  ): EventRegistrationContext | null {
    return account.registrationContext as EventRegistrationContext | null;
  }
}
