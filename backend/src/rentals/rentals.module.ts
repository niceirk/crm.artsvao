import { Module } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
