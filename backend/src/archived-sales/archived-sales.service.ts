import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FindByClientOptions {
  page?: number;
  limit?: number;
  sortBy?: 'saleDate' | 'saleNumber';
  sortOrder?: 'asc' | 'desc';
  year?: number;
  month?: number;
  search?: string;
}

@Injectable()
export class ArchivedSalesService {
  constructor(private prisma: PrismaService) {}

  async findByClient(clientId: string, options: FindByClientOptions = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'saleDate',
      sortOrder = 'desc',
      year,
      month,
      search,
    } = options;

    const skip = (page - 1) * limit;

    // Формируем условие фильтрации по дате
    const where: any = { clientId };

    if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1);
      const endDate = month
        ? new Date(year, month, 0, 23, 59, 59, 999)
        : new Date(year, 11, 31, 23, 59, 59, 999);

      where.saleDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Поиск по номенклатуре (itemName)
    if (search) {
      where.items = {
        some: {
          itemName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.archivedSale.findMany({
        where,
        include: {
          items: true,
          payments: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.archivedSale.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    return this.prisma.archivedSale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        client: {
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

  async getSummary(clientId: string) {
    const sales = await this.prisma.archivedSale.findMany({
      where: { clientId },
      select: {
        saleDate: true,
        totalAmount: true,
        paidAmount: true,
      },
    });

    const yearBreakdown = new Map<number, { count: number; amount: number }>();
    let totalAmount = 0;
    let totalPaid = 0;

    for (const sale of sales) {
      const year = sale.saleDate.getFullYear();
      const current = yearBreakdown.get(year) || { count: 0, amount: 0 };
      current.count++;
      current.amount += Number(sale.totalAmount);
      yearBreakdown.set(year, current);

      totalAmount += Number(sale.totalAmount);
      totalPaid += Number(sale.paidAmount);
    }

    return {
      totalSales: sales.length,
      totalAmount,
      totalPaid,
      yearBreakdown: Array.from(yearBreakdown.entries())
        .map(([year, data]) => ({ year, salesCount: data.count, totalAmount: data.amount }))
        .sort((a, b) => b.year - a.year),
    };
  }
}
