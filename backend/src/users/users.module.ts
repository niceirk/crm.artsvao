import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { S3StorageService } from '../common/services/s3-storage.service';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [UsersService, S3StorageService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
