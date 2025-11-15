import { Module } from '@nestjs/common';
import { LeadSourcesService } from './lead-sources.service';
import { LeadSourcesController } from './lead-sources.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LeadSourcesController],
  providers: [LeadSourcesService],
  exports: [LeadSourcesService],
})
export class LeadSourcesModule {}
