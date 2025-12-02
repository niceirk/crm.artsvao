import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 минут

/**
 * In-memory кэш для справочных данных.
 * Кэширует редко меняющиеся данные: LeadSource, BenefitCategory, ServiceCategory.
 * TTL по умолчанию: 5 минут.
 */
@Injectable()
export class ReferenceDataCache implements OnModuleInit {
  private readonly logger = new Logger(ReferenceDataCache.name);
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.warmUp();
  }

  /**
   * Предварительная загрузка кэша при старте
   */
  private async warmUp() {
    try {
      await Promise.all([
        this.getLeadSources(),
        this.getBenefitCategories(),
        this.getServiceCategories(),
      ]);
      this.logger.log('Reference data cache warmed up successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to warm up cache: ${(error as Error).message}. Will load on demand.`,
      );
    }
  }

  /**
   * Получение или загрузка данных из кэша
   */
  private async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await loader();
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });

    return data;
  }

  /**
   * Источники лидов (откуда узнали о центре)
   */
  async getLeadSources() {
    return this.getOrLoad('leadSources', async () => {
      return this.prisma.leadSource.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  }

  /**
   * Получение LeadSource по ID (из кэша)
   */
  async getLeadSourceById(id: string) {
    const sources = await this.getLeadSources();
    return sources.find((s) => s.id === id) || null;
  }

  /**
   * Категории льгот
   */
  async getBenefitCategories() {
    return this.getOrLoad('benefitCategories', async () => {
      return this.prisma.benefitCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  }

  /**
   * Получение BenefitCategory по ID (из кэша)
   */
  async getBenefitCategoryById(id: string) {
    const categories = await this.getBenefitCategories();
    return categories.find((c) => c.id === id) || null;
  }

  /**
   * Категории услуг
   */
  async getServiceCategories() {
    return this.getOrLoad('serviceCategories', async () => {
      return this.prisma.serviceCategory.findMany({
        orderBy: { name: 'asc' },
      });
    });
  }

  /**
   * Получение ServiceCategory по ID (из кэша)
   */
  async getServiceCategoryById(id: string) {
    const categories = await this.getServiceCategories();
    return categories.find((c) => c.id === id) || null;
  }

  /**
   * Инвалидация конкретного ключа кэша
   */
  invalidate(key: string) {
    this.cache.delete(key);
    this.logger.debug(`Cache invalidated: ${key}`);
  }

  /**
   * Полная очистка кэша
   */
  clear() {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }

  /**
   * Статистика кэша
   */
  getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((entry) => {
      if (entry.expiresAt > now) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
    };
  }
}
