import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramApiService } from '../services/telegram-api.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TelegramApiService', () => {
  let service: TelegramApiService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-bot-token'),
  };

  const mockApiClient = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockedAxios.create.mockReturnValue(mockApiClient as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramApiService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TelegramApiService>(TelegramApiService);

    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockApiClient as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBotToken', () => {
    it('should return bot token', () => {
      expect(service.getBotToken()).toBe('test-bot-token');
    });
  });

  describe('sendMessage', () => {
    it('should send message with correct parameters', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.sendMessage(123456, 'Hello, World!');

      expect(mockApiClient.post).toHaveBeenCalledWith('/sendMessage', {
        chat_id: 123456,
        text: 'Hello, World!',
      });
    });

    it('should include parse_mode when provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.sendMessage(123456, 'Hello', { parse_mode: 'Markdown' });

      expect(mockApiClient.post).toHaveBeenCalledWith('/sendMessage', {
        chat_id: 123456,
        text: 'Hello',
        parse_mode: 'Markdown',
      });
    });

    it('should include remove_keyboard when provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.sendMessage(123456, 'Hello', { remove_keyboard: true });

      expect(mockApiClient.post).toHaveBeenCalledWith('/sendMessage', {
        chat_id: 123456,
        text: 'Hello',
        reply_markup: { remove_keyboard: true },
      });
    });

    it('should throw error on API failure', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API Error'));

      await expect(service.sendMessage(123456, 'Hello')).rejects.toThrow('API Error');
    });
  });

  describe('sendPhoto', () => {
    it('should send photo with caption', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.sendPhoto(123456, 'https://example.com/photo.jpg', 'Caption');

      expect(mockApiClient.post).toHaveBeenCalledWith('/sendPhoto', {
        chat_id: 123456,
        photo: 'https://example.com/photo.jpg',
        caption: 'Caption',
      });
    });

    it('should send photo without caption', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.sendPhoto(123456, 'https://example.com/photo.jpg');

      expect(mockApiClient.post).toHaveBeenCalledWith('/sendPhoto', {
        chat_id: 123456,
        photo: 'https://example.com/photo.jpg',
      });
    });
  });

  describe('sendMessageWithInlineKeyboard', () => {
    it('should send message with inline keyboard', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      const keyboard = [[{ text: 'Button', callback_data: 'action' }]];

      await service.sendMessageWithInlineKeyboard(123456, 'Choose:', keyboard);

      expect(mockApiClient.post).toHaveBeenCalledWith('/sendMessage', {
        chat_id: 123456,
        text: 'Choose:',
        reply_markup: { inline_keyboard: keyboard },
      });
    });
  });

  describe('answerCallbackQuery', () => {
    it('should answer callback query', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.answerCallbackQuery('query-123', 'Done!');

      expect(mockApiClient.post).toHaveBeenCalledWith('/answerCallbackQuery', {
        callback_query_id: 'query-123',
        text: 'Done!',
      });
    });
  });

  describe('setWebhook', () => {
    it('should set webhook URL', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.setWebhook('https://example.com/webhook');

      expect(mockApiClient.post).toHaveBeenCalledWith('/setWebhook', {
        url: 'https://example.com/webhook',
      });
    });
  });

  describe('getWebhookInfo', () => {
    it('should get webhook info', async () => {
      mockApiClient.get.mockResolvedValue({ data: { url: 'https://example.com' } });

      const result = await service.getWebhookInfo();

      expect(mockApiClient.get).toHaveBeenCalledWith('/getWebhookInfo');
      expect(result).toEqual({ url: 'https://example.com' });
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook', async () => {
      mockApiClient.post.mockResolvedValue({ data: { ok: true } });

      await service.deleteWebhook();

      expect(mockApiClient.post).toHaveBeenCalledWith('/deleteWebhook');
    });
  });
});
