import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [TelegramController],
  providers: [TelegramService, S3StorageService],
  exports: [TelegramService],
})
export class TelegramModule {}
