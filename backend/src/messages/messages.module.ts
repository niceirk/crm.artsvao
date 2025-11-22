import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [MessagesController],
  providers: [MessagesService, S3StorageService],
  exports: [MessagesService],
})
export class MessagesModule {}
