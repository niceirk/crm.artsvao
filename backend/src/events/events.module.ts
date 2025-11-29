import { Module, forwardRef } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { EmailModule } from '../email/email.module';
import { PyrusModule } from '../integrations/pyrus/pyrus.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [PrismaModule, SharedModule, EmailModule, forwardRef(() => PyrusModule)],
  controllers: [EventsController],
  providers: [EventsService, S3StorageService],
  exports: [EventsService],
})
export class EventsModule {}
