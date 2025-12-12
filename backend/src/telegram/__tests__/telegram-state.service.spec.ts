import { Test, TestingModule } from '@nestjs/testing';
import { TelegramStateService } from '../services/telegram-state.service';
import { TelegramApiService } from '../services/telegram-api.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramState } from '@prisma/client';
import { EventRegistrationContext } from '../interfaces/state-context.interface';

describe('TelegramStateService', () => {
  let service: TelegramStateService;
  let prisma: jest.Mocked<PrismaService>;
  let apiService: jest.Mocked<TelegramApiService>;

  const mockPrisma = {
    telegramAccount: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      upsert: jest.fn(),
    },
  };

  const mockApiService = {
    getUserProfilePhoto: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramStateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelegramApiService, useValue: mockApiService },
      ],
    }).compile();

    service = module.get<TelegramStateService>(TelegramStateService);
    prisma = module.get(PrismaService);
    apiService = module.get(TelegramApiService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateAccount', () => {
    const mockUser = {
      id: 123456,
      is_bot: false,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    };

    it('should create new account for new user', async () => {
      const mockAccount = {
        id: 'account-1',
        telegramUserId: BigInt(123456),
        chatId: BigInt(123456),
        state: TelegramState.NEW_USER,
        clientId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.telegramAccount.upsert.mockResolvedValue(mockAccount);
      mockApiService.getUserProfilePhoto.mockResolvedValue(null);

      const result = await service.getOrCreateAccount(mockUser, 123456);

      expect(result).toEqual(mockAccount);
      expect(mockPrisma.telegramAccount.upsert).toHaveBeenCalledWith({
        where: { telegramUserId: BigInt(123456) },
        create: expect.objectContaining({
          telegramUserId: BigInt(123456),
          firstName: 'Test',
          state: TelegramState.NEW_USER,
        }),
        update: expect.any(Object),
      });
    });

    it('should set state to IDENTIFIED when clientId provided', async () => {
      const mockAccount = {
        id: 'account-1',
        telegramUserId: BigInt(123456),
        state: TelegramState.IDENTIFIED,
        clientId: 'client-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.telegramAccount.upsert.mockResolvedValue(mockAccount);
      mockApiService.getUserProfilePhoto.mockResolvedValue(null);

      const result = await service.getOrCreateAccount(mockUser, 123456, 'client-1');

      expect(mockPrisma.telegramAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            clientId: 'client-1',
            state: TelegramState.IDENTIFIED,
          }),
        }),
      );
    });
  });

  describe('updateState', () => {
    it('should update state without context', async () => {
      await service.updateState(BigInt(123456), TelegramState.GUEST);

      expect(mockPrisma.telegramAccount.update).toHaveBeenCalledWith({
        where: { telegramUserId: BigInt(123456) },
        data: { state: TelegramState.GUEST },
      });
    });

    it('should update state with context', async () => {
      const context: EventRegistrationContext = {
        eventId: 'event-1',
        step: 'name',
      };

      await service.updateState(BigInt(123456), TelegramState.EVENT_REGISTRATION_NAME, context);

      expect(mockPrisma.telegramAccount.update).toHaveBeenCalledWith({
        where: { telegramUserId: BigInt(123456) },
        data: {
          state: TelegramState.EVENT_REGISTRATION_NAME,
          registrationContext: context,
        },
      });
    });
  });

  describe('isClientConnectionLost', () => {
    it('should return true when IDENTIFIED but no clientId', () => {
      const account = { clientId: null, state: TelegramState.IDENTIFIED };
      expect(service.isClientConnectionLost(account)).toBe(true);
    });

    it('should return true when BOUND_MANUALLY but no clientId', () => {
      const account = { clientId: null, state: TelegramState.BOUND_MANUALLY };
      expect(service.isClientConnectionLost(account)).toBe(true);
    });

    it('should return false when IDENTIFIED with clientId', () => {
      const account = { clientId: 'client-1', state: TelegramState.IDENTIFIED };
      expect(service.isClientConnectionLost(account)).toBe(false);
    });

    it('should return false for GUEST state', () => {
      const account = { clientId: null, state: TelegramState.GUEST };
      expect(service.isClientConnectionLost(account)).toBe(false);
    });
  });

  describe('isEventRegistrationState', () => {
    it('should return true for event registration states', () => {
      expect(service.isEventRegistrationState(TelegramState.EVENT_REGISTRATION_PHONE)).toBe(true);
      expect(service.isEventRegistrationState(TelegramState.EVENT_REGISTRATION_NAME)).toBe(true);
      expect(service.isEventRegistrationState(TelegramState.EVENT_REGISTRATION_BIRTHDATE)).toBe(true);
      expect(service.isEventRegistrationState(TelegramState.EVENT_REGISTRATION_EMAIL)).toBe(true);
      expect(service.isEventRegistrationState(TelegramState.EVENT_CHOOSING_CLIENT)).toBe(true);
    });

    it('should return false for non-event states', () => {
      expect(service.isEventRegistrationState(TelegramState.NEW_USER)).toBe(false);
      expect(service.isEventRegistrationState(TelegramState.IDENTIFIED)).toBe(false);
      expect(service.isEventRegistrationState(TelegramState.GUEST)).toBe(false);
      expect(service.isEventRegistrationState(null)).toBe(false);
    });
  });

  describe('getOrCreateConversation', () => {
    it('should upsert conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        channelAccountId: 'account-1',
        source: 'TELEGRAM',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.conversation.upsert.mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation('account-1');

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.upsert).toHaveBeenCalledWith({
        where: { channelAccountId: 'account-1' },
        create: expect.objectContaining({
          channelAccountId: 'account-1',
          source: 'TELEGRAM',
          status: 'OPEN',
        }),
        update: { status: 'OPEN' },
      });
    });
  });
});
