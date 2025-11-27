import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ArchivedSalesService } from './archived-sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ArchivedSalesController {
  constructor(private readonly archivedSalesService: ArchivedSalesService) {}

  @Get('clients/:clientId/archived-sales')
  findByClient(
    @Param('clientId') clientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('search') search?: string,
  ) {
    return this.archivedSalesService.findByClient(clientId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      sortBy: sortBy === 'saleNumber' ? 'saleNumber' : 'saleDate',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
      search: search || undefined,
    });
  }

  @Get('clients/:clientId/archived-sales/summary')
  getSummary(@Param('clientId') clientId: string) {
    return this.archivedSalesService.getSummary(clientId);
  }

  @Get('archived-sales/:id')
  async findOne(@Param('id') id: string) {
    const sale = await this.archivedSalesService.findOne(id);
    if (!sale) {
      throw new NotFoundException(`Archived sale with ID ${id} not found`);
    }
    return sale;
  }
}
