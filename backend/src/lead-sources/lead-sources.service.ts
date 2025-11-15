import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';

@Injectable()
export class LeadSourcesService {
  constructor(private prisma: PrismaService) {}

  async create(createLeadSourceDto: CreateLeadSourceDto) {
    // Проверяем, не существует ли источник с таким именем
    const existing = await this.prisma.leadSource.findUnique({
      where: { name: createLeadSourceDto.name },
    });

    if (existing) {
      throw new ConflictException('Источник привлечения с таким именем уже существует');
    }

    return this.prisma.leadSource.create({
      data: createLeadSourceDto,
    });
  }

  async findAll() {
    return this.prisma.leadSource.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { clients: true },
        },
      },
    });
  }

  async findAllActive() {
    return this.prisma.leadSource.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const leadSource = await this.prisma.leadSource.findUnique({
      where: { id },
      include: {
        _count: {
          select: { clients: true },
        },
      },
    });

    if (!leadSource) {
      throw new NotFoundException('Источник привлечения не найден');
    }

    return leadSource;
  }

  async update(id: string, updateLeadSourceDto: UpdateLeadSourceDto) {
    // Проверяем существование
    await this.findOne(id);

    // Если меняется имя, проверяем уникальность
    if (updateLeadSourceDto.name) {
      const existing = await this.prisma.leadSource.findUnique({
        where: { name: updateLeadSourceDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Источник привлечения с таким именем уже существует');
      }
    }

    return this.prisma.leadSource.update({
      where: { id },
      data: updateLeadSourceDto,
    });
  }

  async remove(id: string) {
    // Проверяем существование
    await this.findOne(id);

    // Проверяем, нет ли связанных клиентов
    const clientsCount = await this.prisma.client.count({
      where: { leadSourceId: id },
    });

    if (clientsCount > 0) {
      throw new ConflictException(
        `Невозможно удалить источник привлечения. С ним связано клиентов: ${clientsCount}`,
      );
    }

    return this.prisma.leadSource.delete({
      where: { id },
    });
  }
}
