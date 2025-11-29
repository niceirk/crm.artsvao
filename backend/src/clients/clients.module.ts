import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ClientActivityService } from './client-activity.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  providers: [ClientsService, ClientActivityService, S3StorageService],
  controllers: [ClientsController],
  exports: [ClientActivityService],
})
export class ClientsModule {}
