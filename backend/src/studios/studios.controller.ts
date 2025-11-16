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
import { StudiosService } from './studios.service';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('studios')
@UseGuards(JwtAuthGuard)
export class StudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createStudioDto: CreateStudioDto) {
    return this.studiosService.create(createStudioDto);
  }

  @Get()
  findAll() {
    return this.studiosService.findAll();
  }

  @Get(':id/groups')
  getStudioGroups(@Param('id') id: string) {
    return this.studiosService.getStudioGroups(id);
  }

  @Get(':id/subscription-types')
  getStudioSubscriptionTypes(@Param('id') id: string) {
    return this.studiosService.getStudioSubscriptionTypes(id);
  }

  @Get(':id/stats')
  getStudioStats(@Param('id') id: string) {
    return this.studiosService.getStudioStats(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studiosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateStudioDto: UpdateStudioDto,
  ) {
    return this.studiosService.update(id, updateStudioDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.studiosService.remove(id);
  }
}
