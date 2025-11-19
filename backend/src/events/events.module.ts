import { Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { EmailModule } from '../email/email.module';
import { PyrusModule } from '../integrations/pyrus/pyrus.module';

@Module({
  imports: [PrismaModule, SharedModule, EmailModule, forwardRef(() => PyrusModule)],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
