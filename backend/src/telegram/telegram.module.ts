import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3StorageService } from '../common/services/s3-storage.service';
import { MessagesEventsModule } from '../messages/messages-events.module';
import { EventParticipantsModule } from '../event-participants/event-participants.module';

// Services
import {
  TelegramApiService,
  TelegramKeyboardService,
  TelegramStateService,
  TelegramIdentificationService,
  TelegramMessagingService,
  TelegramEventRegistrationService,
} from './services';

// Handlers
import { CommandHandler, CallbackQueryHandler } from './handlers';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MessagesEventsModule,
    forwardRef(() => EventParticipantsModule),
  ],
  controllers: [TelegramController],
  providers: [
    // Core services (no dependencies on other telegram services)
    TelegramApiService,
    TelegramKeyboardService,

    // State management
    TelegramStateService,

    // Feature services
    TelegramIdentificationService,
    TelegramMessagingService,
    TelegramEventRegistrationService,

    // Handlers
    CommandHandler,
    CallbackQueryHandler,

    // Facade
    TelegramService,

    // External dependencies
    S3StorageService,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
