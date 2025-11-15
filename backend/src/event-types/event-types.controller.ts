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
import { EventTypesService } from './event-types.service';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('event-types')
@UseGuards(JwtAuthGuard)
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createEventTypeDto: CreateEventTypeDto) {
    return this.eventTypesService.create(createEventTypeDto);
  }

  @Get()
  findAll() {
    return this.eventTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventTypesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventTypeDto: UpdateEventTypeDto,
  ) {
    return this.eventTypesService.update(id, updateEventTypeDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.eventTypesService.remove(id);
  }
}
