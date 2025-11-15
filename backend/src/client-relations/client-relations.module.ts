import { Module } from '@nestjs/common';
import { ClientRelationsService } from './client-relations.service';
import { ClientRelationsController } from './client-relations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ClientRelationsService],
  controllers: [ClientRelationsController],
})
export class ClientRelationsModule {}
