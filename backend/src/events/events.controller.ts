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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body(ValidationPipe) createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('eventTypeId') eventTypeId?: string,
  ) {
    return this.eventsService.findAll({ date, status, eventTypeId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
