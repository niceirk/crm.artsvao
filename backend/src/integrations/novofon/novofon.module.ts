import { Module } from '@nestjs/common';
import { NovofonController } from './novofon.controller';
import { NovofonService } from './novofon.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NovofonController],
  providers: [NovofonService],
  exports: [NovofonService],
})
export class NovofonModule {}
