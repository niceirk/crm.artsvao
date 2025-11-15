import { Module } from '@nestjs/common';
import { StudiosService } from './studios.service';
import { StudiosController } from './studios.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class StudiosModule {}
