import { Controller, Post, Body, Get, Logger, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramUpdateDto } from './dto/telegram-update.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Webhook endpoint для приема обновлений от Telegram
   * Должен быть публичным (без JWT авторизации)
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
  async handleWebhook(@Body() update: TelegramUpdateDto): Promise<{ ok: boolean }> {
    try {
      this.logger.log(`Received webhook update: ${update.update_id}`);
      this.logger.debug(`Full update: ${JSON.stringify(update)}`);

      await this.telegramService.processUpdate(update);

      this.logger.log(`Successfully processed update: ${update.update_id}`);
      return { ok: true };
    } catch (error) {
      this.logger.error(
        `Error processing webhook update ${update.update_id}: ${error.message}`,
        error.stack,
      );
      this.logger.debug(`Failed update details: ${JSON.stringify(update)}`);

      // Возвращаем 200 OK даже при ошибке, чтобы Telegram не повторял запрос
      // Это предотвращает бесконечные ретраи при постоянных ошибках
      return { ok: false };
    }
  }

  /**
   * Получить информацию о текущем webhook
   */
  @Get('webhook-info')
  async getWebhookInfo() {
    return this.telegramService.getWebhookInfo();
  }

  /**
   * Удалить webhook (для тестирования)
   */
  @Post('delete-webhook')
  async deleteWebhook() {
    return this.telegramService.deleteWebhook();
  }
}
