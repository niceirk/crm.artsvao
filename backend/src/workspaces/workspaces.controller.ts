import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { BatchAvailabilityDto } from './dto/batch-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspacesService.create(createWorkspaceDto);
  }

  @Get()
  findAll(@Query('roomId') roomId?: string) {
    return this.workspacesService.findAll(roomId);
  }

  @Get('by-rooms')
  findByRooms(@Query('roomIds') roomIds: string) {
    const ids = roomIds ? roomIds.split(',').filter(Boolean) : [];
    return this.workspacesService.findByRoomIds(ids);
  }

  @Post('batch-availability')
  getBatchAvailability(@Body(ValidationPipe) dto: BatchAvailabilityDto) {
    return this.workspacesService.getBatchAvailability(
      dto.workspaceIds,
      dto.startDate,
      dto.endDate,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Get(':id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.workspacesService.getAvailability(id, startDate, endDate);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.workspacesService.remove(id);
  }
}
