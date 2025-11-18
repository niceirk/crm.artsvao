import { Module } from '@nestjs/common';
import { ClientNotesService } from './client-notes.service';
import { ClientNotesController } from './client-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientNotesController],
  providers: [ClientNotesService],
  exports: [ClientNotesService],
})
export class ClientNotesModule {}
