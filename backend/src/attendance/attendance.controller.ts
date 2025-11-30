import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  async markAttendance(@Body() dto: CreateAttendanceDto, @Req() req: any) {
    return this.attendanceService.markAttendance(dto, req.user.sub);
  }

  @Get()
  async findAll(@Query() filter: AttendanceFilterDto) {
    return this.attendanceService.findAll(filter);
  }

  @Get('by-schedule/:scheduleId')
  async getBySchedule(@Param('scheduleId') scheduleId: string) {
    return this.attendanceService.getBySchedule(scheduleId);
  }

  @Get('bases/:scheduleId')
  async getBases(@Param('scheduleId') scheduleId: string) {
    return this.attendanceService.getAvailableBases(scheduleId);
  }

  @Get('stats/:clientId')
  async getClientStats(
    @Param('clientId') clientId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getClientStats(clientId, from, to);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @Req() req: any,
  ) {
    return this.attendanceService.updateStatus(id, dto, req.user.sub);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
