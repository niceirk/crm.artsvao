import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';

@Injectable()
export class StudiosService {
  constructor(private prisma: PrismaService) {}

  async create(createStudioDto: CreateStudioDto) {
    return this.prisma.studio.create({
      data: createStudioDto,
    });
  }

  async findAll() {
    return this.prisma.studio.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            groups: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groups: true,
          },
        },
      },
    });

    if (!studio) {
      throw new NotFoundException(`Studio with ID ${id} not found`);
    }

    return studio;
  }

  async update(id: string, updateStudioDto: UpdateStudioDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.studio.update({
      where: { id },
      data: updateStudioDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if studio has groups
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groups: true,
          },
        },
      },
    });

    if (studio._count.groups > 0) {
      throw new BadRequestException('Cannot delete studio that has groups');
    }

    return this.prisma.studio.delete({
      where: { id },
    });
  }
}
