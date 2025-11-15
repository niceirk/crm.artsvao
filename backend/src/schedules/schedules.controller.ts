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
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

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
}
