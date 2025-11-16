import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBenefitCategoryDto } from './dto/create-benefit-category.dto';
import { UpdateBenefitCategoryDto } from './dto/update-benefit-category.dto';

@Injectable()
export class BenefitCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateBenefitCategoryDto) {
    // Проверка уникальности названия
    const existing = await this.prisma.benefitCategory.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Льготная категория с таким названием уже существует');
    }

    return this.prisma.benefitCategory.create({
      data: createDto,
    });
  }

  async findAll() {
    return this.prisma.benefitCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { clients: true },
        },
      },
    });
  }

  async findAllActive() {
    return this.prisma.benefitCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const benefitCategory = await this.prisma.benefitCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { clients: true },
        },
      },
    });

    if (!benefitCategory) {
      throw new NotFoundException('Льготная категория не найдена');
    }

    return benefitCategory;
  }

  async update(id: string, updateDto: UpdateBenefitCategoryDto) {
    // Проверка существования
    await this.findOne(id);

    // Проверка уникальности названия при изменении
    if (updateDto.name) {
      const existing = await this.prisma.benefitCategory.findUnique({
        where: { name: updateDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Льготная категория с таким названием уже существует');
      }
    }

    return this.prisma.benefitCategory.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    // Проверка существования
    await this.findOne(id);

    // Проверка использования
    const clientsCount = await this.prisma.client.count({
      where: { benefitCategoryId: id },
    });

    if (clientsCount > 0) {
      throw new ConflictException(
        `Невозможно удалить льготную категорию. Связано клиентов: ${clientsCount}`,
      );
    }

    return this.prisma.benefitCategory.delete({
      where: { id },
    });
  }
}
