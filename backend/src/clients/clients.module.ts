import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ClientActivityService } from './client-activity.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  providers: [ClientsService, ClientActivityService],
  controllers: [ClientsController],
  exports: [ClientActivityService],
})
export class ClientsModule {}
