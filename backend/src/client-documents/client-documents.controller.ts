import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ClientDocumentsService } from './client-documents.service';
import { CreateClientDocumentDto } from './dto/create-client-document.dto';
import { UpdateClientDocumentDto } from './dto/update-client-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentType } from '@prisma/client';

@Controller('clients/:clientId/documents')
@UseGuards(JwtAuthGuard)
export class ClientDocumentsController {
  constructor(private readonly clientDocumentsService: ClientDocumentsService) {}

  @Post()
  create(
    @Param('clientId') clientId: string,
    @Body() createClientDocumentDto: CreateClientDocumentDto,
  ) {
    return this.clientDocumentsService.create(clientId, createClientDocumentDto);
  }

  @Get()
  findAll(@Param('clientId') clientId: string) {
    return this.clientDocumentsService.findAll(clientId);
  }

  @Get(':documentType')
  findOne(
    @Param('clientId') clientId: string,
    @Param('documentType') documentType: DocumentType,
  ) {
    return this.clientDocumentsService.findOne(clientId, documentType);
  }

  @Patch(':documentType')
  update(
    @Param('clientId') clientId: string,
    @Param('documentType') documentType: DocumentType,
    @Body() updateClientDocumentDto: UpdateClientDocumentDto,
  ) {
    return this.clientDocumentsService.update(
      clientId,
      documentType,
      updateClientDocumentDto,
    );
  }

  @Put()
  upsert(
    @Param('clientId') clientId: string,
    @Body() createClientDocumentDto: CreateClientDocumentDto,
  ) {
    return this.clientDocumentsService.upsert(clientId, createClientDocumentDto);
  }

  @Delete(':documentType')
  remove(
    @Param('clientId') clientId: string,
    @Param('documentType') documentType: DocumentType,
  ) {
    return this.clientDocumentsService.remove(clientId, documentType);
  }
}

@Controller('document-types')
@UseGuards(JwtAuthGuard)
export class DocumentTypesController {
  constructor(private readonly clientDocumentsService: ClientDocumentsService) {}

  @Get()
  getConfig() {
    return this.clientDocumentsService.getDocumentTypeConfig();
  }
}
