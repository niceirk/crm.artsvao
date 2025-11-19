import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QRGeneratorService } from './qr/qr-generator.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, QRGeneratorService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
