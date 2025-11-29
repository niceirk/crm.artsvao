import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NomenclatureFilterDto, NomenclatureItemType } from './dto/nomenclature-filter.dto';
import { CreateSubscriptionTypeNomenclatureDto } from './dto/create-subscription-type-nomenclature.dto';
import { UpdateSubscriptionTypeNomenclatureDto } from './dto/update-subscription-type-nomenclature.dto';
import { UpdateSingleSessionDto } from './dto/update-single-session.dto';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { CreateIndependentServiceDto } from './dto/create-independent-service.dto';
import { UpdateIndependentServiceDto } from './dto/update-independent-service.dto';

export interface NomenclatureItem {
  id: string;
  type: NomenclatureItemType;
  name: string;
  description?: string;
  price: number;
  vatRate: number;
  isActive: boolean;
  group?: {
    id: string;
    name: string;
    studio: {
      id: string;
      name: string;
    };
  };
  category?: {
    id: string;
    name: string;
    defaultVatRate: number;
  };
  subscriptionType?: 'UNLIMITED' | 'SINGLE_VISIT' | 'VISIT_PACK';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NomenclatureService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получить виртуальную номенклатуру - агрегирует данные из:
   * 1. SubscriptionType (типы абонементов)
   * 2. Group (разовые посещения через singleSessionPrice)
   */
  async findAll(filter?: NomenclatureFilterDto): Promise<NomenclatureItem[]> {
    let items: NomenclatureItem[] = [];

    // Для разовых посещений не передаём search в БД запрос,
    // т.к. название формируется после получения данных
    const filterWithoutSearch = filter ? { ...filter, search: undefined } : undefined;

    // 1. Получить типы абонементов
    if (!filter?.type || filter.type === NomenclatureItemType.SUBSCRIPTION) {
      const subscriptionTypes = await this.getSubscriptionTypes(filter);
      items.push(...subscriptionTypes);
    }

    // 2. Получить разовые посещения из групп (без search фильтра в БД)
    if (!filter?.type || filter.type === NomenclatureItemType.SINGLE_SESSION) {
      const singleSessions = await this.getSingleSessions(filterWithoutSearch);
      items.push(...singleSessions);
    }

    // 3. Получить независимые услуги
    if (!filter?.type || filter.type === NomenclatureItemType.INDEPENDENT_SERVICE) {
      const independentServices = await this.getIndependentServices(filter);
      items.push(...independentServices);
    }

    // Фильтрация по итоговому названию (для разовых посещений)
    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      items = items.filter(item => item.name.toLowerCase().includes(searchLower));
    }

    // Сортировка по названию
    items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return items;
  }

  /**
   * Получить типы абонементов как номенклатуру
   */
  private async getSubscriptionTypes(filter?: NomenclatureFilterDto): Promise<NomenclatureItem[]> {
    const where: any = {};

    if (filter?.groupId) {
      where.groupId = filter.groupId;
    }

    // Фильтр по категории - через группу
    if (filter?.categoryId) {
      where.group = {
        serviceCategoryId: filter.categoryId,
      };
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    // Исключаем SINGLE_VISIT и VISIT_PACK - они будут отдельно
    where.type = 'UNLIMITED';

    const subscriptionTypes = await this.prisma.subscriptionType.findMany({
      where,
      include: {
        group: {
          include: {
            studio: { select: { id: true, name: true } },
            serviceCategory: { select: { id: true, name: true, defaultVatRate: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return subscriptionTypes.map((st) => ({
      id: st.id,
      type: NomenclatureItemType.SUBSCRIPTION,
      name: st.name,
      description: `Абонемент для группы ${st.group?.name || 'Без группы'}`,
      price: Number(st.price),
      vatRate: st.vatRate !== null ? Number(st.vatRate) : (st.group?.serviceCategory?.defaultVatRate ? Number(st.group.serviceCategory.defaultVatRate) : 0),
      isActive: st.isActive,
      group: st.group ? {
        id: st.group.id,
        name: st.group.name,
        studio: st.group.studio,
      } : undefined,
      category: st.group?.serviceCategory ? {
        id: st.group.serviceCategory.id,
        name: st.group.serviceCategory.name,
        defaultVatRate: Number(st.group.serviceCategory.defaultVatRate),
      } : undefined,
      subscriptionType: st.type as 'UNLIMITED' | 'SINGLE_VISIT' | 'VISIT_PACK',
      createdAt: st.createdAt,
      updatedAt: st.updatedAt,
    }));
  }

  /**
   * Получить разовые посещения из групп
   */
  private async getSingleSessions(filter?: NomenclatureFilterDto): Promise<NomenclatureItem[]> {
    const where: any = {
      singleSessionPrice: { gt: 0 },
    };

    if (filter?.groupId) {
      where.id = filter.groupId;
    }

    if (filter?.categoryId) {
      where.serviceCategoryId = filter.categoryId;
    }

    if (filter?.isActive !== undefined) {
      where.status = filter.isActive ? 'ACTIVE' : { not: 'ACTIVE' };
    }

    if (filter?.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    const groups = await this.prisma.group.findMany({
      where,
      include: {
        studio: { select: { id: true, name: true } },
        serviceCategory: { select: { id: true, name: true, defaultVatRate: true } },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map((group) => ({
      id: `single-${group.id}`,
      type: NomenclatureItemType.SINGLE_SESSION,
      name: `Разовое посещение - ${group.name}`,
      description: `Разовое посещение группы ${group.name}`,
      price: Number(group.singleSessionPrice),
      vatRate: group.singleSessionVatRate !== null
        ? Number(group.singleSessionVatRate)
        : (group.serviceCategory?.defaultVatRate ? Number(group.serviceCategory.defaultVatRate) : 0),
      isActive: group.status === 'ACTIVE',
      group: {
        id: group.id,
        name: group.name,
        studio: group.studio,
      },
      category: group.serviceCategory ? {
        id: group.serviceCategory.id,
        name: group.serviceCategory.name,
        defaultVatRate: Number(group.serviceCategory.defaultVatRate),
      } : undefined,
      subscriptionType: 'SINGLE_VISIT' as const,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  /**
   * Получить независимые услуги
   */
  private async getIndependentServices(filter?: NomenclatureFilterDto): Promise<NomenclatureItem[]> {
    const where: any = {};

    if (filter?.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    const services = await this.prisma.independentService.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, defaultVatRate: true } },
      },
      orderBy: { name: 'asc' },
    });

    return services.map((service) => ({
      id: service.id,
      type: NomenclatureItemType.INDEPENDENT_SERVICE,
      name: service.name,
      description: service.description || undefined,
      price: Number(service.price),
      vatRate: Number(service.vatRate),
      isActive: service.isActive,
      group: undefined,
      category: service.category ? {
        id: service.category.id,
        name: service.category.name,
        defaultVatRate: Number(service.category.defaultVatRate),
      } : undefined,
      subscriptionType: undefined,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    }));
  }

  /**
   * Получить статистику номенклатуры
   */
  async getStats() {
    const [subscriptionTypesCount, groupsWithSingleSession, independentServicesCount, categoriesCount] = await Promise.all([
      this.prisma.subscriptionType.count({ where: { isActive: true, type: 'UNLIMITED' } }),
      this.prisma.group.count({ where: { status: 'ACTIVE', singleSessionPrice: { gt: 0 } } }),
      this.prisma.independentService.count({ where: { isActive: true } }),
      this.prisma.serviceCategory.count(),
    ]);

    return {
      totalItems: subscriptionTypesCount + groupsWithSingleSession + independentServicesCount,
      subscriptions: subscriptionTypesCount,
      singleSessions: groupsWithSingleSession,
      independentServices: independentServicesCount,
      categories: categoriesCount,
    };
  }

  /**
   * Получить список категорий услуг
   */
  async getCategories() {
    const categories = await this.prisma.serviceCategory.findMany({
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      defaultVatRate: Number(cat.defaultVatRate),
    }));
  }

  // =============================================
  // CRUD для типов абонементов (SubscriptionType)
  // =============================================

  /**
   * Создать тип абонемента
   */
  async createSubscriptionType(dto: CreateSubscriptionTypeNomenclatureDto) {
    // Проверяем существование группы
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      include: {
        serviceCategory: { select: { defaultVatRate: true } },
      },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    // Если НДС не указан, берём из категории группы
    const vatRate = dto.vatRate !== undefined
      ? dto.vatRate
      : (group.serviceCategory?.defaultVatRate ? Number(group.serviceCategory.defaultVatRate) : 0);

    const subscriptionType = await this.prisma.subscriptionType.create({
      data: {
        name: dto.name,
        description: dto.description || `Абонемент для группы ${group.name}`,
        groupId: dto.groupId,
        type: 'UNLIMITED',
        price: dto.price,
        vatRate: vatRate,
        isActive: dto.isActive ?? true,
      },
      include: {
        group: {
          include: {
            studio: { select: { id: true, name: true } },
            serviceCategory: { select: { id: true, name: true, defaultVatRate: true } },
          },
        },
      },
    });

    return subscriptionType;
  }

  /**
   * Обновить тип абонемента
   */
  async updateSubscriptionType(id: string, dto: UpdateSubscriptionTypeNomenclatureDto) {
    // Проверяем существование
    const existing = await this.prisma.subscriptionType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Тип абонемента не найден');
    }

    // Если меняется группа, проверяем её существование
    if (dto.groupId) {
      const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
      if (!group) {
        throw new NotFoundException('Группа не найдена');
      }
    }

    const subscriptionType = await this.prisma.subscriptionType.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        groupId: dto.groupId,
        price: dto.price,
        vatRate: dto.vatRate,
        isActive: dto.isActive,
      },
      include: {
        group: {
          include: {
            studio: { select: { id: true, name: true } },
            serviceCategory: { select: { id: true, name: true, defaultVatRate: true } },
          },
        },
      },
    });

    return subscriptionType;
  }

  /**
   * Деактивировать тип абонемента (мягкое удаление)
   */
  async deactivateSubscriptionType(id: string) {
    const existing = await this.prisma.subscriptionType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Тип абонемента не найден');
    }

    return this.prisma.subscriptionType.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // =============================================
  // CRUD для разовых посещений (через Group)
  // =============================================

  /**
   * Обновить настройки разового посещения для группы
   */
  async updateSingleSession(dto: UpdateSingleSessionDto) {
    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    // Если указана категория, проверяем её существование
    if (dto.serviceCategoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: dto.serviceCategoryId },
      });
      if (!category) {
        throw new NotFoundException('Категория услуг не найдена');
      }
    }

    return this.prisma.group.update({
      where: { id: dto.groupId },
      data: {
        singleSessionPrice: dto.singleSessionPrice,
        singleSessionVatRate: dto.singleSessionVatRate,
        serviceCategoryId: dto.serviceCategoryId,
      },
      include: {
        studio: { select: { id: true, name: true } },
        serviceCategory: { select: { id: true, name: true, defaultVatRate: true } },
      },
    });
  }

  // =============================================
  // CRUD для категорий услуг (ServiceCategory)
  // =============================================

  /**
   * Создать категорию услуг
   */
  async createCategory(dto: CreateServiceCategoryDto) {
    // Проверяем уникальность названия
    const existing = await this.prisma.serviceCategory.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException('Категория с таким названием уже существует');
    }

    return this.prisma.serviceCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        defaultVatRate: dto.defaultVatRate ?? 0,
      },
    });
  }

  /**
   * Обновить категорию услуг
   */
  async updateCategory(id: string, dto: UpdateServiceCategoryDto) {
    const existing = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Категория не найдена');
    }

    // Проверяем уникальность названия при изменении
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.serviceCategory.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new BadRequestException('Категория с таким названием уже существует');
      }
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        defaultVatRate: dto.defaultVatRate,
      },
    });
  }

  /**
   * Удалить категорию услуг
   */
  async deleteCategory(id: string) {
    const existing = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Категория не найдена');
    }

    // Проверяем наличие связанных групп
    const groupsCount = await this.prisma.group.count({
      where: { serviceCategoryId: id },
    });

    if (groupsCount > 0) {
      throw new BadRequestException(
        `Невозможно удалить категорию: к ней привязано ${groupsCount} групп. Сначала измените категорию у этих групп.`
      );
    }

    return this.prisma.serviceCategory.delete({ where: { id } });
  }

  // =============================================
  // CRUD для независимых услуг (IndependentService)
  // =============================================

  /**
   * Получить список всех независимых услуг
   */
  async getIndependentServicesList() {
    const services = await this.prisma.independentService.findMany({
      where: { isActive: true },
      include: {
        category: { select: { id: true, name: true, defaultVatRate: true } },
      },
      orderBy: { name: 'asc' },
    });

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: Number(service.price),
      vatRate: Number(service.vatRate),
      isActive: service.isActive,
      category: service.category ? {
        id: service.category.id,
        name: service.category.name,
        defaultVatRate: Number(service.category.defaultVatRate),
      } : undefined,
    }));
  }

  /**
   * Создать независимую услугу
   */
  async createIndependentService(dto: CreateIndependentServiceDto) {
    // Если указана категория, проверяем её существование
    if (dto.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Категория услуг не найдена');
      }
    }

    const service = await this.prisma.independentService.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        vatRate: dto.vatRate ?? 0,
        categoryId: dto.categoryId,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: { select: { id: true, name: true, defaultVatRate: true } },
      },
    });

    return service;
  }

  /**
   * Обновить независимую услугу
   */
  async updateIndependentService(id: string, dto: UpdateIndependentServiceDto) {
    const existing = await this.prisma.independentService.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Услуга не найдена');
    }

    // Если указана категория, проверяем её существование
    if (dto.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Категория услуг не найдена');
      }
    }

    const service = await this.prisma.independentService.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        vatRate: dto.vatRate,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
      },
      include: {
        category: { select: { id: true, name: true, defaultVatRate: true } },
      },
    });

    return service;
  }

  /**
   * Деактивировать независимую услугу
   */
  async deactivateIndependentService(id: string) {
    const existing = await this.prisma.independentService.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Услуга не найдена');
    }

    return this.prisma.independentService.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
