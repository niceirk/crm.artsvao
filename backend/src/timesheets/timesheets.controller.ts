import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Res,
  Header,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { TimesheetsService } from './timesheets.service';
import { TimesheetFilterDto } from './dto/timesheet-filter.dto';
import { UpdateCompensationDto } from './dto/update-compensation.dto';
import { CreateBulkInvoicesDto } from './dto/create-bulk-invoices.dto';
import { ImportAttendanceDto } from './dto/import-attendance.dto';
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
   * Экспорт табеля в Excel (синхронный, для обратной совместимости)
   * Для больших табелей рекомендуется использовать /export/async
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
   * Запуск асинхронного экспорта табеля в Excel.
   * Возвращает jobId для отслеживания статуса.
   */
  @Post('export/async')
  async startExportAsync(@Body() filter: TimesheetFilterDto) {
    return this.timesheetsService.startExportAsync(filter);
  }

  /**
   * Получить статус задачи экспорта
   */
  @Get('export/status/:jobId')
  async getExportStatus(@Param('jobId') jobId: string) {
    const job = this.timesheetsService.getExportJob(jobId);
    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Скачать результат экспорта
   */
  @Get('export/download/:jobId')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadExport(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const job = this.timesheetsService.getExportJob(jobId);

    if (job.status !== 'completed') {
      throw new NotFoundException(`Экспорт ещё не готов. Статус: ${job.status}`);
    }

    const buffer = this.timesheetsService.getExportResult(jobId);
    if (!buffer) {
      throw new NotFoundException('Файл экспорта уже был скачан или истёк');
    }

    const month = job.filter.month || new Date().toISOString().slice(0, 7);
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
   * Получить детализацию перерасчёта для клиента
   */
  @Get('recalculation-details')
  async getRecalculationDetails(
    @Query('clientId') clientId: string,
    @Query('groupId') groupId: string,
    @Query('month') month: string,
  ) {
    return this.timesheetsService.getRecalculationDetails(clientId, groupId, month);
  }

  /**
   * Обновить компенсацию (ручная корректировка с настройками перерасчёта)
   */
  @Patch('compensation/:id')
  async updateCompensation(
    @Param('id') id: string,
    @Body() dto: UpdateCompensationDto,
  ) {
    return this.timesheetsService.updateCompensation(id, dto);
  }

  /**
   * Создать или обновить компенсацию по clientId, groupId, month
   */
  @Put('compensation')
  async upsertCompensation(
    @Body() dto: UpdateCompensationDto & { clientId: string; groupId: string; month: string },
  ) {
    return this.timesheetsService.upsertCompensation(dto);
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

  /**
   * Импорт посещаемости из Excel файла (ОтчетГруппа.xlsx)
   */
  @Post('import-attendance')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importAttendance(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportAttendanceDto,
  ) {
    return this.timesheetsService.importAttendance(file, dto.groupId);
  }
}
