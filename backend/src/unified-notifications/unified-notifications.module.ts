import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { EmailModule } from '../email/email.module';

// Services
import { UnifiedNotificationsService } from './unified-notifications.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationRendererService } from './notification-renderer.service';

// Channel Adapters
import { TelegramChannelAdapter } from './channels/telegram.channel';
import { EmailChannelAdapter } from './channels/email.channel';

// Controller
import { UnifiedNotificationsController } from './unified-notifications.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => TelegramModule),
    EmailModule,
  ],
  controllers: [UnifiedNotificationsController],
  providers: [
    UnifiedNotificationsService,
    NotificationQueueService,
    NotificationRendererService,
    TelegramChannelAdapter,
    EmailChannelAdapter,
  ],
  exports: [
    UnifiedNotificationsService,
    NotificationQueueService,
    NotificationRendererService,
  ],
})
export class UnifiedNotificationsModule {}
