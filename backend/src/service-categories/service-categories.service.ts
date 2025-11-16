import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceCategoryDto) {
    // Проверка уникальности названия
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Категория услуг с таким названием уже существует');
    }

    return this.prisma.serviceCategory.create({
      data: createDto,
    });
  }

  async findAll() {
    return this.prisma.serviceCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { services: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const serviceCategory = await this.prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { services: true },
        },
      },
    });

    if (!serviceCategory) {
      throw new NotFoundException('Категория услуг не найдена');
    }

    return serviceCategory;
  }

  async update(id: string, updateDto: UpdateServiceCategoryDto) {
    // Проверка существования
    await this.findOne(id);

    // Проверка уникальности названия при изменении
    if (updateDto.name) {
      const existing = await this.prisma.serviceCategory.findUnique({
        where: { name: updateDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Категория услуг с таким названием уже существует');
      }
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    // Проверка существования
    await this.findOne(id);

    // Проверка использования
    const servicesCount = await this.prisma.service.count({
      where: { categoryId: id },
    });

    if (servicesCount > 0) {
      throw new ConflictException(
        `Невозможно удалить категорию. Связано услуг: ${servicesCount}`,
      );
    }

    return this.prisma.serviceCategory.delete({
      where: { id },
    });
  }
}
