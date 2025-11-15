import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRelationDto } from './dto/create-relation.dto';

@Injectable()
export class ClientRelationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Создать родственную связь между клиентами
   */
  async createRelation(clientId: string, createRelationDto: CreateRelationDto) {
    const { relatedClientId, relationType } = createRelationDto;

    // Проверка существования обоих клиентов
    const [client, relatedClient] = await Promise.all([
      this.prisma.client.findUnique({ where: { id: clientId } }),
      this.prisma.client.findUnique({ where: { id: relatedClientId } }),
    ]);

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    if (!relatedClient) {
      throw new NotFoundException(`Related client with ID ${relatedClientId} not found`);
    }

    // Проверка на попытку связать клиента с самим собой
    if (clientId === relatedClientId) {
      throw new BadRequestException('Cannot create relation with the same client');
    }

    // Проверка на существующую связь
    const existingRelation = await this.prisma.clientRelation.findFirst({
      where: {
        OR: [
          { clientId, relatedClientId, relationType },
          { clientId: relatedClientId, relatedClientId: clientId, relationType },
        ],
      },
    });

    if (existingRelation) {
      throw new BadRequestException('This relation already exists');
    }

    // Создание связи
    return this.prisma.clientRelation.create({
      data: {
        clientId,
        relatedClientId,
        relationType,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
        relatedClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
      },
    });
  }

  /**
   * Получить все связи клиента
   */
  async getClientRelations(clientId: string) {
    // Проверка существования клиента
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Получаем связи где клиент является источником
    const relations = await this.prisma.clientRelation.findMany({
      where: { clientId },
      include: {
        relatedClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            dateOfBirth: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Получаем обратные связи где клиент является целью
    const relatedTo = await this.prisma.clientRelation.findMany({
      where: { relatedClientId: clientId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            dateOfBirth: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      relations, // Связи исходящие от клиента
      relatedTo, // Связи входящие к клиенту
    };
  }

  /**
   * Удалить родственную связь
   */
  async deleteRelation(clientId: string, relationId: string) {
    // Проверка существования связи
    const relation = await this.prisma.clientRelation.findUnique({
      where: { id: relationId },
    });

    if (!relation) {
      throw new NotFoundException(`Relation with ID ${relationId} not found`);
    }

    // Проверка что связь принадлежит указанному клиенту
    if (relation.clientId !== clientId) {
      throw new BadRequestException(
        'This relation does not belong to the specified client',
      );
    }

    // Удаление связи
    return this.prisma.clientRelation.delete({
      where: { id: relationId },
    });
  }
}
