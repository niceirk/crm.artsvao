import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDocumentDto } from './dto/create-client-document.dto';
import { UpdateClientDocumentDto } from './dto/update-client-document.dto';
import { DocumentType } from '@prisma/client';

@Injectable()
export class ClientDocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: string, createClientDocumentDto: CreateClientDocumentDto) {
    // Проверяем существование клиента
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Проверяем, нет ли уже документа этого типа
    const existing = await this.prisma.clientDocument.findUnique({
      where: {
        clientId_documentType: {
          clientId,
          documentType: createClientDocumentDto.documentType,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Document of type ${createClientDocumentDto.documentType} already exists for this client`,
      );
    }

    return this.prisma.clientDocument.create({
      data: {
        ...createClientDocumentDto,
        clientId,
        issuedAt: createClientDocumentDto.issuedAt ? new Date(createClientDocumentDto.issuedAt) : null,
        expiresAt: createClientDocumentDto.expiresAt ? new Date(createClientDocumentDto.expiresAt) : null,
      },
    });
  }

  async findAll(clientId: string) {
    return this.prisma.clientDocument.findMany({
      where: { clientId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(clientId: string, documentType: DocumentType) {
    const document = await this.prisma.clientDocument.findUnique({
      where: {
        clientId_documentType: {
          clientId,
          documentType,
        },
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Document of type ${documentType} not found for client ${clientId}`,
      );
    }

    return document;
  }

  async update(
    clientId: string,
    documentType: DocumentType,
    updateClientDocumentDto: UpdateClientDocumentDto,
  ) {
    // Проверяем существование документа
    await this.findOne(clientId, documentType);

    return this.prisma.clientDocument.update({
      where: {
        clientId_documentType: {
          clientId,
          documentType,
        },
      },
      data: {
        ...updateClientDocumentDto,
        issuedAt: updateClientDocumentDto.issuedAt
          ? new Date(updateClientDocumentDto.issuedAt)
          : undefined,
        expiresAt: updateClientDocumentDto.expiresAt
          ? new Date(updateClientDocumentDto.expiresAt)
          : undefined,
      },
    });
  }

  async upsert(clientId: string, createClientDocumentDto: CreateClientDocumentDto) {
    // Проверяем существование клиента
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    return this.prisma.clientDocument.upsert({
      where: {
        clientId_documentType: {
          clientId,
          documentType: createClientDocumentDto.documentType,
        },
      },
      create: {
        ...createClientDocumentDto,
        clientId,
        issuedAt: createClientDocumentDto.issuedAt ? new Date(createClientDocumentDto.issuedAt) : null,
        expiresAt: createClientDocumentDto.expiresAt ? new Date(createClientDocumentDto.expiresAt) : null,
      },
      update: {
        ...createClientDocumentDto,
        issuedAt: createClientDocumentDto.issuedAt ? new Date(createClientDocumentDto.issuedAt) : undefined,
        expiresAt: createClientDocumentDto.expiresAt ? new Date(createClientDocumentDto.expiresAt) : undefined,
      },
    });
  }

  async remove(clientId: string, documentType: DocumentType) {
    // Проверяем существование документа
    await this.findOne(clientId, documentType);

    return this.prisma.clientDocument.delete({
      where: {
        clientId_documentType: {
          clientId,
          documentType,
        },
      },
    });
  }

  async getDocumentTypeConfig() {
    return {
      PASSPORT: {
        label: 'Паспорт РФ',
        fields: ['series', 'number', 'issuedBy', 'issuedAt', 'departmentCode', 'citizenship'],
        requiredFields: ['series', 'number', 'issuedBy', 'issuedAt'],
      },
      BIRTH_CERTIFICATE: {
        label: 'Свидетельство о рождении',
        fields: ['series', 'number', 'issuedBy', 'issuedAt'],
        requiredFields: ['number', 'issuedBy'],
      },
      DRIVERS_LICENSE: {
        label: 'Водительское удостоверение',
        fields: ['series', 'number', 'issuedBy', 'issuedAt', 'expiresAt'],
        requiredFields: ['series', 'number', 'issuedBy', 'issuedAt'],
      },
      SNILS: {
        label: 'СНИЛС',
        fields: ['number'],
        requiredFields: ['number'],
      },
      FOREIGN_PASSPORT: {
        label: 'Заграничный паспорт',
        fields: ['series', 'number', 'issuedBy', 'issuedAt', 'expiresAt', 'citizenship'],
        requiredFields: ['series', 'number', 'issuedAt'],
      },
      INN: {
        label: 'ИНН',
        fields: ['number', 'issuedBy', 'issuedAt'],
        requiredFields: ['number'],
      },
      MEDICAL_CERTIFICATE: {
        label: 'Медицинская справка',
        fields: ['number', 'issuedBy', 'issuedAt', 'expiresAt'],
        requiredFields: ['number'],
      },
      MSE_CERTIFICATE: {
        label: 'Справка МСЭ',
        fields: ['number', 'issuedBy', 'issuedAt', 'expiresAt'],
        requiredFields: ['number'],
      },
      OTHER: {
        label: 'Другой документ',
        fields: ['number', 'issuedBy', 'issuedAt', 'expiresAt', 'fullDisplay'],
        requiredFields: [],
      },
    };
  }
}
