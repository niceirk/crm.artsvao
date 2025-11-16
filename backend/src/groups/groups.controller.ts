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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id/members')
  getGroupMembers(@Param('id') id: string) {
    return this.groupsService.getGroupMembers(id);
  }

  @Get(':id/schedule/monthly')
  getGroupMonthlySchedule(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.groupsService.getGroupMonthlySchedule(id, parseInt(year), parseInt(month));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id/weekly-schedule')
  @UseGuards(AdminGuard)
  updateWeeklySchedule(
    @Param('id') id: string,
    @Body('weeklySchedule') weeklySchedule: any[]
  ) {
    return this.groupsService.updateWeeklySchedule(id, weeklySchedule);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}
