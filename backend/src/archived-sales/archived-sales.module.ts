import { Module } from '@nestjs/common';
import { ArchivedSalesController } from './archived-sales.controller';
import { ArchivedSalesService } from './archived-sales.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ArchivedSalesController],
  providers: [ArchivedSalesService],
  exports: [ArchivedSalesService],
})
export class ArchivedSalesModule {}
