import { Module } from '@nestjs/common';
import { ClientDocumentsService } from './client-documents.service';
import {
  ClientDocumentsController,
  DocumentTypesController,
} from './client-documents.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClientDocumentsController, DocumentTypesController],
  providers: [ClientDocumentsService],
  exports: [ClientDocumentsService],
})
export class ClientDocumentsModule {}
