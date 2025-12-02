import { Module } from '@nestjs/common';
import { RentalApplicationsController } from './rental-applications.controller';
import { RentalApplicationsService } from './rental-applications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [PrismaModule, SharedModule, InvoicesModule],
  controllers: [RentalApplicationsController],
  providers: [RentalApplicationsService],
  exports: [RentalApplicationsService],
})
export class RentalApplicationsModule {}
