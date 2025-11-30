import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { RecurringScheduleService } from './recurring-schedule.service';
import { BulkScheduleService } from './bulk-schedule.service';
import { SchedulePlannerService } from './schedule-planner.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateRecurringScheduleDto } from './dto/create-recurring-schedule.dto';
import { BulkUpdateScheduleDto } from './dto/bulk-update-schedule.dto';
import { CopyScheduleDto } from './dto/copy-schedule.dto';
import { BulkCancelScheduleDto } from './dto/bulk-cancel-schedule.dto';
import { BulkDeleteScheduleDto } from './dto/bulk-delete-schedule.dto';
import { PreviewRecurringScheduleDto } from './dto/preview-recurring-schedule.dto';
import { BulkCreateRecurringDto } from './dto/bulk-create-recurring.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly recurringScheduleService: RecurringScheduleService,
    private readonly bulkScheduleService: BulkScheduleService,
    private readonly schedulePlannerService: SchedulePlannerService,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.create(createScheduleDto);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('roomId') roomId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.schedulesService.findAll({ date, roomId, teacherId, groupId });
  }

  // ВАЖНО: маршруты planned должны быть ВЫШЕ :id, иначе "planned" будет интерпретирован как id
  @Get('planned')
  getPlannedSchedules(
    @Query('status') status?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('groupIds') groupIds?: string,
  ) {
    return this.schedulePlannerService.getPlannedSchedules({
      status,
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      groupIds: groupIds ? groupIds.split(',') : undefined,
    });
  }

  @Get('planned/months-stats')
  getPlannedMonthsStats(@Query('groupIds') groupIds?: string) {
    return this.schedulePlannerService.getPlannedMonthsStats(
      groupIds ? groupIds.split(',') : undefined,
    );
  }

  // ВАЖНО: маршруты bulk должны быть ВЫШЕ :id
  @Patch('bulk')
  @UseGuards(AdminGuard)
  bulkUpdate(@Body(ValidationPipe) dto: BulkUpdateScheduleDto) {
    return this.bulkScheduleService.bulkUpdate(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }

  @Post('recurring')
  @UseGuards(AdminGuard)
  createRecurring(@Body(ValidationPipe) dto: CreateRecurringScheduleDto) {
    return this.recurringScheduleService.createRecurring(dto);
  }

  @Post('copy')
  @UseGuards(AdminGuard)
  copySchedules(@Body(ValidationPipe) dto: CopyScheduleDto) {
    return this.bulkScheduleService.copySchedules(dto);
  }

  @Post('bulk-cancel')
  @UseGuards(AdminGuard)
  bulkCancel(@Body(ValidationPipe) dto: BulkCancelScheduleDto) {
    return this.bulkScheduleService.bulkCancel(dto);
  }

  @Post('bulk-delete')
  @UseGuards(AdminGuard)
  bulkDelete(@Body(ValidationPipe) dto: BulkDeleteScheduleDto) {
    return this.bulkScheduleService.bulkDelete(dto);
  }

  // ===== Schedule Planner Endpoints =====

  @Post('recurring/preview')
  @UseGuards(AdminGuard)
  previewRecurring(@Body(ValidationPipe) dto: PreviewRecurringScheduleDto) {
    return this.schedulePlannerService.previewRecurring(dto);
  }

  @Post('recurring/bulk')
  @UseGuards(AdminGuard)
  bulkCreateRecurring(@Body(ValidationPipe) dto: BulkCreateRecurringDto) {
    return this.schedulePlannerService.bulkCreateRecurring(dto);
  }
}
