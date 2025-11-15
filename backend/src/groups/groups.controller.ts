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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
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
