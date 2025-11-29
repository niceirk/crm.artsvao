import { Module } from '@nestjs/common';
import { StudiosService } from './studios.service';
import { StudiosController } from './studios.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudiosController],
  providers: [StudiosService, S3StorageService],
  exports: [StudiosService],
})
export class StudiosModule {}
