import { Module, forwardRef } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { RentalApplicationsModule } from '../rental-applications/rental-applications.module';

@Module({
  imports: [PrismaModule, SharedModule, InvoicesModule, forwardRef(() => RentalApplicationsModule)],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
