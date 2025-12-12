import { Module, forwardRef } from '@nestjs/common';
import { EventParticipantsController } from './event-participants.controller';
import { EventParticipantsService } from './event-participants.service';
import { EventReminderService } from './event-reminder.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TimepadModule } from '../integrations/timepad/timepad.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    PrismaModule,
    TimepadModule,
    AuditLogModule,
    forwardRef(() => TelegramModule),
  ],
  controllers: [EventParticipantsController],
  providers: [EventParticipantsService, EventReminderService],
  exports: [EventParticipantsService],
})
export class EventParticipantsModule {}
