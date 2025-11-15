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
import { LeadSourcesService } from './lead-sources.service';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('lead-sources')
@UseGuards(JwtAuthGuard)
export class LeadSourcesController {
  constructor(private readonly leadSourcesService: LeadSourcesService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createLeadSourceDto: CreateLeadSourceDto) {
    return this.leadSourcesService.create(createLeadSourceDto);
  }

  @Get()
  findAll() {
    return this.leadSourcesService.findAll();
  }

  @Get('active')
  findAllActive() {
    return this.leadSourcesService.findAllActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadSourcesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateLeadSourceDto: UpdateLeadSourceDto,
  ) {
    return this.leadSourcesService.update(id, updateLeadSourceDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.leadSourcesService.remove(id);
  }
}
