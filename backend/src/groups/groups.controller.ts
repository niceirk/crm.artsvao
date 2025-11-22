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
import { GroupFilterDto } from './dto/group-filter.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GroupMemberStatus } from '@prisma/client';

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
  findAll(@Query(ValidationPipe) filterDto: GroupFilterDto) {
    return this.groupsService.findAll(filterDto);
  }

  @Get(':id/members')
  getGroupMembers(
    @Param('id') id: string,
    @Query('status') status?: GroupMemberStatus,
  ) {
    return this.groupsService.getGroupMembers(id, status);
  }

  @Get(':id/availability')
  checkAvailability(@Param('id') id: string) {
    return this.groupsService.checkAvailability(id);
  }

  @Get(':id/waitlist')
  getWaitlist(@Param('id') id: string) {
    return this.groupsService.getWaitlist(id);
  }

  @Post(':id/members')
  @UseGuards(AdminGuard)
  addMember(
    @Param('id') groupId: string,
    @Body(ValidationPipe) dto: AddMemberDto,
  ) {
    return this.groupsService.addMember(groupId, dto.clientId);
  }

  @Delete('members/:id')
  @UseGuards(AdminGuard)
  removeMember(@Param('id') memberId: string) {
    return this.groupsService.removeMember(memberId);
  }

  @Patch('members/:id/status')
  @UseGuards(AdminGuard)
  updateMemberStatus(
    @Param('id') memberId: string,
    @Body(ValidationPipe) dto: UpdateMemberStatusDto,
  ) {
    return this.groupsService.updateMemberStatus(memberId, dto.status);
  }

  @Get(':id/schedule/monthly')
  getGroupMonthlySchedule(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.groupsService.getGroupMonthlySchedule(id, parseInt(year), parseInt(month));
  }

  @Get(':id/scheduled-months')
  getScheduledMonths(@Param('id') id: string) {
    return this.groupsService.getScheduledMonths(id);
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
