import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientFilterDto } from './dto/client-filter.dto';
import { ClientStatus, AuditAction } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(createClientDto: CreateClientDto, userId: string) {
    const client = await this.prisma.client.create({
      data: {
        firstName: createClientDto.firstName,
        lastName: createClientDto.lastName,
        middleName: createClientDto.middleName,
        phone: createClientDto.phone || '',
        email: createClientDto.email,
        address: createClientDto.address,
        notes: createClientDto.notes,
        photoUrl: createClientDto.photoUrl,
        leadSourceId: createClientDto.leadSourceId,
        dateOfBirth: createClientDto.dateOfBirth
          ? new Date(createClientDto.dateOfBirth)
          : null,
      },
      include: {
        leadSource: true,
      },
    });

    // Log the creation
    await this.auditLog.log({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Client',
      entityId: client.id,
      changes: { created: createClientDto },
    });

    return client;
  }

  async findAll(filterDto: ClientFilterDto) {
    const { search, status, leadSource, discount, page = 1, limit = 20 } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { middleName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (leadSource) {
      where.leadSourceId = leadSource;
    }

    if (discount) {
      where.discount = discount;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leadSource: {
            select: {
              id: true,
              name: true,
            },
          },
          // Relations loaded only on detail view for performance
          _count: {
            select: {
              relations: true,
              relatedTo: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        leadSource: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        relations: {
          include: {
            relatedClient: true,
          },
        },
        relatedTo: {
          include: {
            client: true,
          },
        },
        subscriptions: {
          include: {
            subscriptionType: true,
            group: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: string, updateClientDto: UpdateClientDto, userId: string) {
    const oldClient = await this.findOne(id); // Check if exists

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: {
        ...updateClientDto,
        dateOfBirth: updateClientDto.dateOfBirth
          ? new Date(updateClientDto.dateOfBirth)
          : undefined,
      } as any,
      include: {
        leadSource: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Log the update with changes
    await this.auditLog.log({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Client',
      entityId: id,
      changes: {
        before: this.sanitizeForLog(oldClient),
        after: updateClientDto,
      },
    });

    return updatedClient;
  }

  private sanitizeForLog(client: any) {
    const { subscriptions, payments, relations, relatedTo, ...rest } = client;
    return rest;
  }

  async remove(id: string, userId: string) {
    const client = await this.findOne(id); // Check if exists

    // Soft delete - update status to INACTIVE
    const deletedClient = await this.prisma.client.update({
      where: { id },
      data: { status: ClientStatus.INACTIVE as any },
    });

    // Log the deletion
    await this.auditLog.log({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Client',
      entityId: id,
      changes: {
        deleted: {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          status: ClientStatus.INACTIVE,
        },
      },
    });

    return deletedClient;
  }

  async search(query: string) {
    return this.prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { middleName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
        status: { not: ClientStatus.INACTIVE as any },
      },
      take: 20,
      orderBy: { lastName: 'asc' },
    });
  }
}
