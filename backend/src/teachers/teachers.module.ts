import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeachersController],
  providers: [TeachersService, S3StorageService],
  exports: [TeachersService],
})
export class TeachersModule {}
