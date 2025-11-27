import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { TimesheetsService } from './timesheets.service';
import { TimesheetFilterDto } from './dto/timesheet-filter.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { CreateBulkInvoicesDto } from './dto/create-bulk-invoices.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('timesheets')
@UseGuards(JwtAuthGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  /**
   * Получить табель посещаемости для группы за месяц
   */
  @Get()
  async getTimesheet(@Query() filter: TimesheetFilterDto) {
    return this.timesheetsService.getTimesheet(filter);
  }

  /**
   * Экспорт табеля в Excel
   */
  @Get('export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportToExcel(
    @Query() filter: TimesheetFilterDto,
    @Res() res: Response,
  ) {
    const buffer = await this.timesheetsService.exportToExcel(filter);

    // Формируем имя файла
    const month = filter.month || new Date().toISOString().slice(0, 7);
    const filename = encodeURIComponent(`Табель_${month}.xlsx`);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
    res.send(buffer);
  }

  /**
   * Получить список студий для фильтра
   */
  @Get('studios')
  async getStudios() {
    return this.timesheetsService.getStudiosForFilter();
  }

  /**
   * Получить список групп для фильтра
   */
  @Get('groups')
  async getGroups(@Query('studioId') studioId?: string) {
    return this.timesheetsService.getGroupsForFilter(studioId);
  }

  /**
   * Обновить компенсацию (ручная корректировка)
   */
  @Patch('compensation/:id')
  async updateCompensation(
    @Param('id') id: string,
    @Body() dto: UpdateCompensationDto,
  ) {
    return this.timesheetsService.updateCompensation(id, dto);
  }

  /**
   * Создать счета для выбранных клиентов на следующий месяц
   */
  @Post('create-invoices')
  async createBulkInvoices(
    @Body() dto: CreateBulkInvoicesDto,
    @Request() req: any,
  ) {
    return this.timesheetsService.createBulkInvoices(dto, req.user?.id);
  }
}
